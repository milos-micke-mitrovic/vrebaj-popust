import "dotenv/config";
import { PrismaClient, Store, Gender } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Expand compound sizes so exact-match filtering works.
 * "43-45" → ["43","44","45"], "38 2/3" → ["38","39"], "S/M" → ["S","M"], etc.
 */
function normalizeSizes(sizes: string[]): string[] {
  const result = new Set<string>();

  for (const raw of sizes) {
    const s = raw.trim();
    if (!s) continue;

    // Range: "36-37", "43-45"
    const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]);
      const hi = parseInt(rangeMatch[2]);
      for (let i = lo; i <= hi; i++) result.add(String(i));
      continue;
    }

    // Fractional: "38 2/3", "44 1/3"
    const fracMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fracMatch) {
      const whole = parseInt(fracMatch[1]);
      result.add(String(whole));
      result.add(String(whole + 1));
      continue;
    }

    // Decimal: "42.5"
    const decMatch = s.match(/^(\d+)\.(\d+)$/);
    if (decMatch) {
      const num = parseFloat(s);
      result.add(String(Math.floor(num)));
      result.add(String(Math.ceil(num)));
      continue;
    }

    // Compound letter: "S/M", "M/L"
    if (/^[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(s)) {
      for (const part of s.split("/")) result.add(part.toUpperCase());
      continue;
    }

    result.add(s);
  }

  return [...result];
}

export interface DealInput {
  id: string;
  store: Store;
  name: string;
  brand: string | null;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  url: string;
  imageUrl: string | null;
  sizes?: string[];
  description?: string | null;
  detailImageUrl?: string | null;
  categories?: string[];
  gender?: Gender;
}

export async function upsertDeal(deal: DealInput): Promise<void> {
  const sizes = deal.sizes ? normalizeSizes(deal.sizes) : undefined;
  await prisma.deal.upsert({
    where: { url: deal.url },
    update: {
      name: deal.name,
      brand: deal.brand,
      originalPrice: deal.originalPrice,
      salePrice: deal.salePrice,
      discountPercent: deal.discountPercent,
      imageUrl: deal.imageUrl,
      categories: deal.categories || [],
      gender: deal.gender || "unisex",
      scrapedAt: new Date(),
      // Only overwrite detail-scraper fields if explicitly provided
      ...(sizes && sizes.length > 0 && { sizes }),
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
      sizes: sizes || [],
      description: deal.description || null,
      detailImageUrl: deal.detailImageUrl || null,
      categories: deal.categories || [],
      gender: deal.gender || "unisex",
      scrapedAt: new Date(),
    },
  });
}

export async function upsertDeals(deals: DealInput[]): Promise<number> {
  let count = 0;
  for (const deal of deals) {
    try {
      await upsertDeal(deal);
      count++;
    } catch (err) {
      console.error(`Error upserting ${deal.url}:`, err instanceof Error ? err.message : err);
    }
  }
  return count;
}

export async function logScrapeRun(
  store: Store,
  totalScraped: number,
  filteredCount: number,
  errors: string[]
): Promise<void> {
  await prisma.scrapeRun.create({
    data: {
      store,
      totalScraped,
      filteredCount,
      errors,
      completedAt: new Date(),
    },
  });
}

export async function updateDealDetails(
  url: string,
  details: {
    sizes?: string[];
    description?: string | null;
    detailImageUrl?: string | null;
    categories?: string[];
    gender?: Gender;
  }
): Promise<void> {
  await prisma.deal.update({
    where: { url },
    data: {
      sizes: details.sizes ? normalizeSizes(details.sizes) : details.sizes,
      description: details.description,
      detailImageUrl: details.detailImageUrl,
      categories: details.categories,
      gender: details.gender,
      detailsScrapedAt: new Date(),
    },
  });
}

/**
 * Get deals that need detail scraping:
 * - Never scraped (detailsScrapedAt is null)
 * - Empty sizes (retry in case store restocked)
 * - Stale details (older than maxAge, default 24h — picks up size changes and mapper fixes)
 */
export async function getDealsWithoutDetails(
  store: Store,
  maxAgeHours = 24
): Promise<{ id: string; url: string; name: string }[]> {
  const staleThreshold = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  return prisma.deal.findMany({
    where: {
      store,
      OR: [
        { detailsScrapedAt: null },
        { sizes: { isEmpty: true } },
        { detailsScrapedAt: { lt: staleThreshold } },
      ],
    },
    select: { id: true, url: true, name: true },
  });
}

export async function getAllDeals(store?: Store) {
  return prisma.deal.findMany({
    where: store ? { store } : undefined,
    orderBy: { discountPercent: "desc" },
  });
}

// Minimum products required to consider a scrape successful
// If fewer products found, assume scraper failed and don't delete old products
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
 * Clean up stale products for a store after a successful scrape.
 * Only deletes products if:
 * 1. The scrape found more than the minimum threshold
 * 2. The products weren't updated in the current scrape run
 */
export async function cleanupStaleProducts(
  store: Store,
  scrapeStartTime: Date,
  productsFound: number
): Promise<number> {
  const threshold = MIN_PRODUCTS_THRESHOLD[store];

  // If scraper found too few products, assume it failed - don't delete anything
  if (productsFound < threshold) {
    console.log(`[${store}] Only found ${productsFound} products (threshold: ${threshold}). Skipping cleanup to avoid data loss.`);
    return 0;
  }

  // Delete products that weren't updated in this scrape run
  const result = await prisma.deal.deleteMany({
    where: {
      store,
      scrapedAt: {
        lt: scrapeStartTime,
      },
    },
  });

  if (result.count > 0) {
    console.log(`[${store}] Cleaned up ${result.count} stale products`);
  }

  return result.count;
}

/**
 * Delete a deal by URL (used when product is out of stock / no sizes)
 */
export async function deleteDealByUrl(url: string): Promise<boolean> {
  try {
    await prisma.deal.delete({ where: { url } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get count of existing products for a store
 */
export async function getStoreProductCount(store: Store): Promise<number> {
  return prisma.deal.count({ where: { store } });
}

/**
 * Reset details for a store to force re-scraping
 */
export async function resetStoreDetails(store: Store): Promise<number> {
  const result = await prisma.deal.updateMany({
    where: { store },
    data: {
      sizes: [],
      detailsScrapedAt: null,
    },
  });
  console.log(`[${store}] Reset details for ${result.count} products`);
  return result.count;
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma, Store, Gender };
