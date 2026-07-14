// Server-side D1 write/read operations behind /api/ingest. These run on the Worker
// (where the D1 binding lives) via the per-request Prisma client. The scrapers no
// longer touch the DB directly — they POST here (see src/scraper/db-writer.ts).
import { getPrisma } from "@/lib/db";
import { stringifyStringArray } from "@/lib/json-array";
import type {
  DealInput,
  DealDetailsInput,
  DealToDetail,
  ScrapeRunSummary,
} from "@/lib/ingest-types";
import type { Store } from "@/types/deal";

/**
 * Expand compound sizes so exact-match filtering works.
 * "43-45" → ["43","44","45"], "38 2/3" → ["38","39"], "S/M" → ["S","M"], etc.
 * (Moved server-side from the old db-writer so all write-time transforms live here.)
 */
export function normalizeSizes(sizes: string[]): string[] {
  const result = new Set<string>();

  for (const raw of sizes) {
    const s = raw.trim();
    if (!s) continue;

    const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]);
      const hi = parseInt(rangeMatch[2]);
      for (let i = lo; i <= hi; i++) result.add(String(i));
      continue;
    }

    const fracMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fracMatch) {
      const whole = parseInt(fracMatch[1]);
      result.add(String(whole));
      result.add(String(whole + 1));
      continue;
    }

    const decMatch = s.match(/^(\d+)\.(\d+)$/);
    if (decMatch) {
      const num = parseFloat(s);
      result.add(String(Math.floor(num)));
      result.add(String(Math.ceil(num)));
      continue;
    }

    if (/^[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(s)) {
      for (const part of s.split("/")) result.add(part.toUpperCase());
      continue;
    }

    result.add(s);
  }

  return [...result];
}

// Minimum products for a scrape to be considered successful. If a run finds fewer,
// cleanup is skipped so a broken scraper can't wipe a store's catalogue.
const MIN_PRODUCTS_THRESHOLD: Record<Store, number> = {
  djaksport: 10,
  planeta: 10,
  nsport: 5,
  sportvision: 10,
  buzz: 10,
  officeshoes: 10,
  intersport: 10,
  trefsport: 5,
};

/**
 * Upsert a batch of deals. Each is wrapped in its own try/catch so one bad product
 * can't abort the batch; returns the count written and any per-deal failures.
 */
export async function upsertDeals(
  deals: DealInput[]
): Promise<{ ok: number; failed: { url: string; error: string }[] }> {
  const prisma = await getPrisma();
  let ok = 0;
  const failed: { url: string; error: string }[] = [];

  for (const deal of deals) {
    try {
      const sizes = deal.sizes ? normalizeSizes(deal.sizes) : undefined;
      // scrapedAt comes from the scraper's clock (ISO); fall back to now.
      const scrapedAt = deal.scrapedAt ? new Date(deal.scrapedAt) : new Date();

      await prisma.deal.upsert({
        where: { url: deal.url },
        update: {
          name: deal.name,
          brand: deal.brand,
          originalPrice: deal.originalPrice,
          salePrice: deal.salePrice,
          discountPercent: deal.discountPercent,
          imageUrl: deal.imageUrl,
          categories: stringifyStringArray(deal.categories),
          gender: deal.gender || "unisex",
          scrapedAt,
          // Only overwrite detail-scraper fields if explicitly provided.
          ...(sizes && sizes.length > 0 && { sizes: stringifyStringArray(sizes) }),
          ...(deal.description != null && { description: deal.description }),
          ...(deal.detailImageUrl != null && { detailImageUrl: deal.detailImageUrl }),
        },
        create: {
          id: deal.id,
          store: deal.store,
          name: deal.name,
          brand: deal.brand,
          originalPrice: deal.originalPrice,
          salePrice: deal.salePrice,
          discountPercent: deal.discountPercent,
          url: deal.url,
          imageUrl: deal.imageUrl,
          sizes: stringifyStringArray(sizes),
          description: deal.description || null,
          detailImageUrl: deal.detailImageUrl || null,
          categories: stringifyStringArray(deal.categories),
          gender: deal.gender || "unisex",
          scrapedAt,
        },
      });
      ok++;
    } catch (err) {
      failed.push({ url: deal.url, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { ok, failed };
}

export async function updateDealDetails(url: string, details: DealDetailsInput): Promise<void> {
  const prisma = await getPrisma();
  await prisma.deal.update({
    where: { url },
    data: {
      // Only overwrite array columns when provided (undefined = leave unchanged).
      ...(details.sizes && { sizes: stringifyStringArray(normalizeSizes(details.sizes)) }),
      description: details.description,
      detailImageUrl: details.detailImageUrl,
      ...(details.categories && { categories: stringifyStringArray(details.categories) }),
      gender: details.gender,
      detailsScrapedAt: new Date(),
    },
  });
}

export async function logScrapeRun(
  store: Store,
  totalScraped: number,
  filteredCount: number,
  errors: string[]
): Promise<void> {
  const prisma = await getPrisma();
  await prisma.scrapeRun.create({
    data: {
      store,
      totalScraped,
      filteredCount,
      errors: stringifyStringArray(errors),
      completedAt: new Date(),
    },
  });
}

/**
 * Delete a store's stale products after a successful scrape: rows not touched this
 * run (scrapedAt < scrapeStartTime). Skipped if the run found fewer than the store's
 * threshold, so a broken scraper can't wipe the catalogue. scrapeStartTime is the
 * scraper's clock (same as the scrapedAt it wrote), avoiding cross-clock skew.
 */
export async function cleanupStaleProducts(
  store: Store,
  scrapeStartTime: string,
  productsFound: number
): Promise<number> {
  const threshold = MIN_PRODUCTS_THRESHOLD[store] ?? 10;
  if (productsFound < threshold) return 0;

  const prisma = await getPrisma();
  const result = await prisma.deal.deleteMany({
    where: { store, scrapedAt: { lt: new Date(scrapeStartTime) } },
  });
  return result.count;
}

export async function deleteDealByUrl(url: string): Promise<boolean> {
  const prisma = await getPrisma();
  try {
    await prisma.deal.delete({ where: { url } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deals that still need detail scraping: never scraped, or scraped more than
 * `staleDays` ago (never-scraped first). staleBefore is computed here (server clock)
 * to match detailsScrapedAt, which is also written server-side.
 */
export async function getDealsForDetailScraping(
  store: Store,
  staleDays = 7
): Promise<DealToDetail[]> {
  const prisma = await getPrisma();
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  return prisma.deal.findMany({
    where: {
      store,
      OR: [{ detailsScrapedAt: null }, { detailsScrapedAt: { lt: staleBefore } }],
    },
    select: { id: true, url: true, name: true },
    // SQLite sorts NULLs first in ASC order, so never-scraped deals come first
    // without an explicit `nulls` clause (which SQLite/D1 doesn't support).
    orderBy: { detailsScrapedAt: "asc" },
  });
}

/** Recent scrape runs (last `sinceHours`), newest first — feeds the health-check. */
export async function getRecentScrapeRuns(sinceHours = 6): Promise<ScrapeRunSummary[]> {
  const prisma = await getPrisma();
  const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const runs = await prisma.scrapeRun.findMany({
    where: { startedAt: { gte: cutoff } },
    orderBy: { startedAt: "desc" },
    select: { store: true, filteredCount: true, errors: true, startedAt: true },
  });
  return runs.map((r) => ({
    store: r.store,
    filteredCount: r.filteredCount,
    errors: r.errors,
    startedAt: r.startedAt.toISOString(),
  }));
}
