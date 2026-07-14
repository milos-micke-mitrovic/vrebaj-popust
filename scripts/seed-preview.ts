/**
 * Seed the local `cf:preview` D1 with representative data by POSTing through the
 * real /api/ingest endpoint — so Prisma (via the D1 adapter) writes every DateTime
 * in its own format (avoids the "Inconsistent column data" mixed int/text trap) and
 * the scraper write path gets smoke-tested at the same time.
 *
 * Prereqs: schema applied to local D1, `pnpm cf:preview` running, and a `.dev.vars`
 * containing INGEST_SECRET (see .dev.vars.example).
 *
 * Run:  PREVIEW_URL=http://localhost:8787 INGEST_SECRET=... pnpm tsx scripts/seed-preview.ts
 */
import type { DealInput } from "../src/lib/ingest-types";
import type { Store, Gender } from "../src/types/deal";

const BASE = process.env.PREVIEW_URL || "http://localhost:8787";
const SECRET = process.env.INGEST_SECRET || "dev-ingest-secret";
const INGEST = `${BASE}/api/ingest`;

const STORES: Store[] = [
  "djaksport", "planeta", "nsport", "buzz",
  "officeshoes", "intersport", "sportvision", "trefsport",
];
const GENDERS: Gender[] = ["muski", "zenski", "deciji", "unisex"];
// Mixed casing on purpose — the brand filter must match all of these via variants.
const BRANDS = ["NIKE", "Nike", "adidas", "ADIDAS", "Puma", "New Balance", "NEW BALANCE", "Reebok"];
const CATEGORY_SETS: string[][] = [
  ["obuca/patike"],
  ["obuca/cipele"],
  ["odeca/jakne"],
  ["odeca/majice"],
  ["oprema/torbe"],
  [], // uncategorized → "ostalo" (only counts when detailsScrapedAt is set)
];
const SIZE_SETS: string[][] = [
  ["40", "41", "42", "43"],
  ["S", "M", "L", "XL"],
  ["44", "45", "46"],
  [],
];

function buildDeals(): DealInput[] {
  const deals: DealInput[] = [];
  let i = 0;
  for (const store of STORES) {
    for (let k = 0; k < 6; k++) {
      const brand = BRANDS[(i + k) % BRANDS.length];
      const categories = CATEGORY_SETS[(i + k) % CATEGORY_SETS.length];
      const sizes = SIZE_SETS[(i + k) % SIZE_SETS.length];
      const gender = GENDERS[(i + k) % GENDERS.length];
      const discount = 50 + ((i * 7 + k * 11) % 45); // 50–94%
      const salePrice = 1500 + ((i * 137 + k * 91) % 18000);
      const originalPrice = Math.round(salePrice / (1 - discount / 100));
      // Half get detail-scraped (so empty-category ones become "ostalo", not "pending").
      const detailed = k % 2 === 0;
      deals.push({
        id: `${store}-seed-${i}`,
        store,
        name: `${brand} ${categories[0]?.split("/")[1] || "proizvod"} ${i}`,
        brand,
        originalPrice,
        salePrice,
        discountPercent: discount,
        url: `https://example.com/${store}/seed-product-${i}`,
        imageUrl: `https://www.djaksport.com/placeholder-${i}.jpg`,
        gender,
        categories,
        ...(detailed ? { sizes, description: `Opis proizvoda ${i}` } : {}),
      });
      i++;
    }
  }
  return deals;
}

async function ingest(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${action} → HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  console.log(`Seeding via ${INGEST}`);
  const deals = buildDeals();

  // Upsert in chunks (same as the real db-writer).
  const CHUNK = 50;
  let ok = 0;
  const failed: { url: string; error: string }[] = [];
  for (let i = 0; i < deals.length; i += CHUNK) {
    const chunk = deals.slice(i, i + CHUNK);
    const res = (await ingest("upsertDeals", { deals: chunk })) as {
      ok: number;
      failed: { url: string; error: string }[];
    };
    ok += res.ok;
    failed.push(...(res.failed || []));
  }
  console.log(`Upserted ${ok}/${deals.length} deals` + (failed.length ? `, ${failed.length} failed` : ""));
  if (failed.length) console.log("First failure:", failed[0]);

  // Detail-scrape a couple so updateDealDetails is exercised too.
  await ingest("updateDealDetails", {
    url: `https://example.com/djaksport/seed-product-1`,
    details: { sizes: ["42", "43"], categories: ["obuca/patike"], gender: "muski" },
  });

  // Log a scrape run per store so the health-check has data.
  for (const store of STORES) {
    const count = deals.filter((d) => d.store === store).length;
    await ingest("logScrapeRun", { store, totalScraped: count + 5, filteredCount: count, errors: [] });
  }

  // Verify via the public read path.
  const dealsRes = await fetch(`${BASE}/api/deals?limit=1`);
  const body = (await dealsRes.json()) as { pagination?: { total?: number }; error?: string };
  if (body.error) throw new Error(`/api/deals returned error: ${body.error}`);
  console.log(`/api/deals reports total = ${body.pagination?.total} deals ✅`);
  console.log("Seed complete. Open the preview URL in a browser to smoke-test.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
