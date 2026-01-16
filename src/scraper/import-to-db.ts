import "dotenv/config";
import { prisma } from "../lib/db";
import type { Store, Gender } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

interface JsonDeal {
  id: string;
  store: string;
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
  gender?: string;
  scrapedAt: string;
  detailsScrapedAt?: string;
}

interface JsonFile {
  store: string;
  deals: JsonDeal[];
  totalScraped: number;
  filteredCount: number;
  scrapedAt: string;
  errors: string[];
}

const VALID_STORES: Store[] = ["djaksport", "planeta", "sportvision", "nsport", "buzz", "officeshoes"];
const VALID_GENDERS: Gender[] = ["muski", "zenski", "deciji", "unisex"];

function mapGender(gender: string | undefined): Gender {
  if (gender && VALID_GENDERS.includes(gender as Gender)) {
    return gender as Gender;
  }
  return "unisex";
}

async function importStore(storeName: string): Promise<number> {
  const filePath = path.join(DATA_DIR, `${storeName}-deals.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  No data file for ${storeName}, skipping`);
    return 0;
  }

  const data: JsonFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (!VALID_STORES.includes(data.store as Store)) {
    console.log(`  Invalid store: ${data.store}, skipping`);
    return 0;
  }

  console.log(`  Found ${data.deals.length} deals`);

  let imported = 0;
  for (const deal of data.deals) {
    try {
      await prisma.deal.upsert({
        where: { id: deal.id },
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
          gender: mapGender(deal.gender),
          scrapedAt: new Date(deal.scrapedAt),
          detailsScrapedAt: deal.detailsScrapedAt ? new Date(deal.detailsScrapedAt) : null,
        },
        create: {
          id: deal.id,
          store: data.store as Store,
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
          gender: mapGender(deal.gender),
          scrapedAt: new Date(deal.scrapedAt),
          detailsScrapedAt: deal.detailsScrapedAt ? new Date(deal.detailsScrapedAt) : null,
        },
      });
      imported++;
    } catch (err) {
      console.error(`  Error importing ${deal.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // Log scrape run
  await prisma.scrapeRun.create({
    data: {
      store: data.store as Store,
      totalScraped: data.totalScraped,
      filteredCount: data.filteredCount,
      errors: data.errors,
      completedAt: new Date(),
    },
  });

  return imported;
}

async function main() {
  console.log("Importing deals from JSON files to database...\n");

  let totalImported = 0;

  for (const store of VALID_STORES) {
    console.log(`\n=== ${store} ===`);
    const count = await importStore(store);
    totalImported += count;
    console.log(`  Imported: ${count} deals`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Total imported: ${totalImported} deals`);

  // Print summary
  const counts = await prisma.deal.groupBy({
    by: ["store"],
    _count: true,
  });

  console.log("\nDatabase summary:");
  for (const c of counts) {
    console.log(`  ${c.store}: ${c._count} deals`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
