/**
 * Data cleanup script: removes out-of-stock products, fixes stale category
 * paths, and re-runs category/gender extraction.
 *
 * Run with: pnpm tsx src/scripts/cleanup-data.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mapCategory } from "../lib/category-mapper";
import { extractGenderFromNameUrl } from "../lib/gender-mapper";

const prisma = new PrismaClient();

// Old category path → new category path
const CATEGORY_PATH_REPLACEMENTS: Record<string, string> = {
  "oprema/rancevi": "oprema/torbe",
  "odeca/vetrovke": "odeca/jakne",
  "obuca/klompe": "obuca/papuce",
  "oprema/novcanici": "oprema/torbe",
  "oprema/vrece": "oprema/torbe",
  "oprema/kacketi": "oprema/kape",
};

async function cleanup() {
  console.log("Starting data cleanup...\n");

  // ── Step 1: Delete out-of-stock obuca/odeca products ──
  // Only delete footwear/clothing with no sizes — accessories can be one-size
  console.log("Step 1: Deleting out-of-stock obuca/odeca products...");

  const emptyDeals = await prisma.deal.findMany({
    where: {
      detailsScrapedAt: { not: null },
      sizes: { isEmpty: true },
    },
    select: { id: true, name: true, url: true, categories: true },
  });

  let deletedCount = 0;
  for (const deal of emptyDeals) {
    const cat = mapCategory(deal.name + " " + deal.url);
    const hasObucaOdeca = cat && (cat.startsWith("obuca/") || cat.startsWith("odeca/")) ||
      deal.categories.some(c => c.startsWith("obuca/") || c.startsWith("odeca/"));

    if (hasObucaOdeca) {
      await prisma.deal.delete({ where: { id: deal.id } });
      deletedCount++;
    }
  }

  console.log(`  Found ${emptyDeals.length} products with no sizes, deleted ${deletedCount} (obuca/odeca only)\n`);

  // ── Step 2 & 3: Fix category paths + re-extract category/gender ──
  console.log("Step 2: Fixing stale category paths...");
  console.log("Step 3: Re-running category/gender extraction...\n");

  const deals = await prisma.deal.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      categories: true,
      gender: true,
    },
  });

  console.log(`Processing ${deals.length} remaining deals...\n`);

  let categoryPathsFixed = 0;
  let genderUpdated = 0;
  let categoriesUpdated = 0;

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];
    let newCategories = [...deal.categories];
    let changed = false;

    // Step 2: Replace stale category paths
    let pathFixed = false;
    for (const [oldPath, newPath] of Object.entries(CATEGORY_PATH_REPLACEMENTS)) {
      const idx = newCategories.indexOf(oldPath);
      if (idx !== -1) {
        newCategories[idx] = newPath;
        pathFixed = true;
      }
    }
    // Deduplicate after replacements
    if (pathFixed) {
      newCategories = [...new Set(newCategories)];
      categoryPathsFixed++;
      changed = true;
    }

    // Step 3a: Re-extract category
    const mapped = mapCategory(deal.name + " " + deal.url);
    let categoryAdded = false;
    if (mapped !== null && !newCategories.includes(mapped)) {
      newCategories.push(mapped);
      categoryAdded = true;
      categoriesUpdated++;
      changed = true;
    }

    // Step 3b: Re-extract gender
    const extractedGender = extractGenderFromNameUrl(deal.name, deal.url);
    const genderChanged = extractedGender !== deal.gender;
    if (genderChanged) {
      genderUpdated++;
      changed = true;
    }

    // Persist if anything changed
    if (changed) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          categories: newCategories,
          ...(genderChanged && { gender: extractedGender }),
        },
      });
    }

    // Progress log every 500 products
    if ((i + 1) % 500 === 0) {
      console.log(`  Processed ${i + 1}/${deals.length} deals...`);
    }
  }

  // ── Summary ──
  console.log("\n=== Cleanup Complete ===");
  console.log(`Deleted (out-of-stock):   ${deletedCount}`);
  console.log(`Category paths fixed:     ${categoryPathsFixed}`);
  console.log(`Gender updated:           ${genderUpdated}`);
  console.log(`Categories updated:       ${categoriesUpdated}`);

  await prisma.$disconnect();
}

cleanup().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
