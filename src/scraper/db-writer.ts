import "dotenv/config";
import { PrismaClient, Store, Gender } from "@prisma/client";

const prisma = new PrismaClient();

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
  await prisma.deal.upsert({
    where: { url: deal.url },
    update: {
      name: deal.name,
      brand: deal.brand,
      originalPrice: deal.originalPrice,
      salePrice: deal.salePrice,
      discountPercent: deal.discountPercent,
      imageUrl: deal.imageUrl,
      sizes: deal.sizes || [],
      description: deal.description || null,
      detailImageUrl: deal.detailImageUrl || null,
      categories: deal.categories || [],
      gender: deal.gender || "unisex",
      scrapedAt: new Date(),
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
      sizes: deal.sizes || [],
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
      sizes: details.sizes,
      description: details.description,
      detailImageUrl: details.detailImageUrl,
      categories: details.categories,
      gender: details.gender,
      detailsScrapedAt: new Date(),
    },
  });
}

export async function getDealsWithoutDetails(store: Store): Promise<{ id: string; url: string; name: string }[]> {
  return prisma.deal.findMany({
    where: {
      store,
      OR: [
        { detailsScrapedAt: null },
        { sizes: { isEmpty: true } },
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
