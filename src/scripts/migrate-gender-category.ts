/**
 * Migration script to update gender and category for all deals
 * Run with: pnpm tsx src/scripts/migrate-gender-category.ts
 */

import { prisma } from "../lib/db";
import type { Gender } from "@prisma/client";

// Normalize Serbian characters to ASCII equivalents
function normalizeSerbianChars(text: string): string {
  return text
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/đ/g, "dj");
}

// Extract gender from product name and URL
function extractGender(name: string, url: string): Gender {
  const text = normalizeSerbianChars(`${name} ${url}`);

  // Kids patterns - check first as it's most specific
  if (
    text.includes("decij") ||
    text.includes("decak") ||
    text.includes("decac") ||
    text.includes("devojc") ||
    text.includes("devoj") ||
    text.includes("deca") ||
    text.includes("/deca/") ||
    text.includes("-deca-") ||
    text.includes(" kid") ||
    text.includes(" kids") ||
    text.includes("-kid-") ||
    text.includes(" bp") ||
    text.includes(" bg") ||
    text.includes(" ps") ||
    text.includes(" gs") ||
    text.includes(" td") ||
    text.includes(" junior") ||
    text.includes(" jr") ||
    text.includes("-jr-") ||
    text.includes(" youth") ||
    text.includes("/decije-") ||
    text.includes("/decija-") ||
    text.includes("beba") ||
    text.includes("bebe") ||
    text.includes("infant") ||
    text.includes("toddler") ||
    text.includes("child") ||
    text.includes("children")
  ) {
    return "deciji";
  }

  // Women patterns
  if (
    text.includes("zenski") ||
    text.includes("zensk") ||
    text.includes("za zene") ||
    text.includes(" zene") ||
    text.includes(" zena") ||
    text.includes("/zene/") ||
    text.includes("/zena/") ||
    text.includes("/zenske-") ||
    text.includes("/zenska-") ||
    text.includes("-zenske-") ||
    text.includes(" w ") ||
    text.endsWith(" w") ||
    text.includes("-w-") ||
    text.includes(" wmns") ||
    text.includes(" women") ||
    text.includes("woman") ||
    text.includes("/women/") ||
    text.includes("-women-") ||
    text.includes(" lady") ||
    text.includes(" ladies") ||
    text.includes("female") ||
    text.includes(" girl") ||
    text.includes("/girl/")
  ) {
    return "zenski";
  }

  // Men patterns
  if (
    text.includes("muski") ||
    text.includes("musk") ||
    text.includes("muskarc") ||
    text.includes("za muskarce") ||
    text.includes("/muskarci/") ||
    text.includes("/muskarac/") ||
    text.includes("/muske-") ||
    text.includes("/muska-") ||
    text.includes("-muske-") ||
    text.includes(" m ") ||
    text.endsWith(" m") ||
    text.includes("-m-") ||
    text.includes(" men ") ||
    text.includes(" men's") ||
    text.includes("/men/") ||
    text.includes("-men-") ||
    text.includes("male") ||
    text.includes(" guy")
  ) {
    return "muski";
  }

  return "unisex";
}

// Extract category from product name and URL
type Category = "patike" | "cipele" | "cizme" | "jakna" | "majica" | "duks" | "trenerka" | "sorc" | "helanke" | "ranac" | "ostalo";

function extractCategory(name: string, url: string): { category: Category; categoryPath: string | null } {
  const text = normalizeSerbianChars(`${name} ${url}`);

  // Cizme - boots
  if (text.includes("cizm") || text.includes("boot") || text.includes("gumenjak")) {
    return { category: "cizme", categoryPath: "obuca/cizme" };
  }

  // Patike - sneakers
  if (
    text.includes("patik") ||
    text.includes("sneaker") ||
    text.includes("kopack") ||
    text.includes("tenisic") ||
    text.includes("trainer") ||
    text.includes("running") ||
    text.includes("lifestyle-patike") ||
    text.includes("patike-za-") ||
    text.includes("/patike/")
  ) {
    return { category: "patike", categoryPath: "obuca/patike" };
  }

  // Cipele - shoes
  if (
    text.includes("cipel") ||
    text.includes("/cipele/") ||
    (text.includes("shoe") && !text.includes("sneaker"))
  ) {
    return { category: "cipele", categoryPath: "obuca/cipele" };
  }

  // Jakne - jackets
  if (
    text.includes("jakn") ||
    text.includes("jacket") ||
    text.includes("prslu") ||
    text.includes("vest") ||
    text.includes("vetrovk") ||
    text.includes("windbreak") ||
    text.includes("zimsk") ||
    text.includes("puffer") ||
    text.includes("/jakne/")
  ) {
    return { category: "jakna", categoryPath: "odeca/jakne" };
  }

  // Majice - t-shirts
  if (
    text.includes("majic") ||
    text.includes("t-shirt") ||
    text.includes("tshirt") ||
    text.includes(" tee ") ||
    text.includes("dres") ||
    text.includes("jersey") ||
    text.includes("polo") ||
    text.includes("tank top") ||
    text.includes("/majice/")
  ) {
    return { category: "majica", categoryPath: "odeca/majice" };
  }

  // Duksevi - hoodies
  if (
    text.includes("duks") ||
    text.includes("hoodie") ||
    text.includes("sweat") ||
    text.includes("hudica") ||
    text.includes("pulover") ||
    text.includes("/duksevi/")
  ) {
    return { category: "duks", categoryPath: "odeca/duksevi" };
  }

  // Trenerke - tracksuits
  if (
    text.includes("trenerk") ||
    text.includes("tracksuit") ||
    text.includes("donji deo") ||
    text.includes("pantalon") ||
    text.includes("jogger") ||
    text.includes("sweatpant") ||
    text.includes("/trenerka/") ||
    text.includes("/trenerke/")
  ) {
    return { category: "trenerka", categoryPath: "odeca/trenerke" };
  }

  // Sorcevi - shorts
  if (
    text.includes("sorc") ||
    text.includes("short") ||
    text.includes("bermud") ||
    text.includes("/sorcevi/")
  ) {
    return { category: "sorc", categoryPath: "odeca/sorcevi" };
  }

  // Helanke - leggings
  if (
    text.includes("helank") ||
    text.includes("legging") ||
    text.includes("tight") ||
    text.includes("tajic") ||
    text.includes("/helanke/")
  ) {
    return { category: "helanke", categoryPath: "odeca/helanke" };
  }

  // Ranci - backpacks
  if (
    text.includes("ranac") ||
    text.includes("backpack") ||
    text.includes("torb") ||
    text.includes("ruksak") ||
    text.includes("duffel") ||
    text.includes("gym bag") ||
    text.includes("/torbe/") ||
    text.includes("/rancevi/")
  ) {
    return { category: "ranac", categoryPath: "oprema/torbe" };
  }

  return { category: "ostalo", categoryPath: null };
}

async function migrateGenderCategory() {
  console.log("Starting migration of gender and category...\n");

  const deals = await prisma.deal.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      gender: true,
      categories: true,
    },
  });

  console.log(`Found ${deals.length} deals to process\n`);

  let updatedGender = 0;
  let updatedCategory = 0;
  let errors = 0;

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];

    try {
      const extractedGender = extractGender(deal.name, deal.url);
      const { categoryPath } = extractCategory(deal.name, deal.url);

      const needsUpdate =
        deal.gender !== extractedGender ||
        (categoryPath && !deal.categories.includes(categoryPath));

      if (needsUpdate) {
        const newCategories = categoryPath
          ? [...new Set([...deal.categories, categoryPath])]
          : deal.categories;

        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            gender: extractedGender,
            categories: newCategories,
          },
        });

        if (deal.gender !== extractedGender) updatedGender++;
        if (categoryPath && !deal.categories.includes(categoryPath)) updatedCategory++;
      }

      // Progress log every 500 deals
      if ((i + 1) % 500 === 0) {
        console.log(`Processed ${i + 1}/${deals.length} deals...`);
      }
    } catch (err) {
      errors++;
      console.error(`Error processing deal ${deal.id}:`, err);
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Total deals: ${deals.length}`);
  console.log(`Updated gender: ${updatedGender}`);
  console.log(`Updated category: ${updatedCategory}`);
  console.log(`Errors: ${errors}`);

  await prisma.$disconnect();
}

migrateGenderCategory().catch(console.error);
