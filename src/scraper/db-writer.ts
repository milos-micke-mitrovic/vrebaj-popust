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

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma, Store, Gender };
