import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "officeshoes" as const;

// Map product type prefixes to gender
const GENDER_MAP: Record<string, Gender> = {
  "ŽENSKE": "zenski",
  "ZENSKE": "zenski",
  "MUŠKE": "muski",
  "MUSKE": "muski",
  "DEČIJE": "deciji",
  "DECIJE": "deciji",
  "DEČJE": "deciji",
  "DECJE": "deciji",
  "UNISEX": "unisex",
};

// Map product types to categories
const CATEGORY_MAP: Record<string, string> = {
  "PATIKE": "obuca/patike",
  "CIPELE": "obuca/cipele",
  "ČIZME": "obuca/cizme",
  "CIZME": "obuca/cizme",
  "SANDALE": "obuca/sandale",
  "PAPUČE": "obuca/papuce",
  "PAPUCE": "obuca/papuce",
  "JAPANKE": "obuca/japanke",
  "MOKASINE": "obuca/cipele",
  "GLEŽNJAČE": "obuca/cizme",
  "GLEZNJACE": "obuca/cizme",
  "BALETANKE": "obuca/cipele",
  "KLOMPE": "obuca/papuce",
  "ESPADRILE": "obuca/cipele",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  }) as Promise<Browser>;
}

interface ProductDetails {
  productType: string | null; // e.g., "Ženske patike"
  tags: string[];
  sizes: string[];
}

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var result = {
        productType: null,
        tags: [],
        sizes: []
      };

      // Extract from "Informacije o proizvodu" section
      var detailsList = document.querySelector('.content-details ul');
      if (detailsList) {
        var items = detailsList.querySelectorAll('li');
        items.forEach(function(li, index) {
          var text = li.textContent.trim();

          // First item after "Šifra proizvoda" is usually the product type
          // Look for patterns like "Ženske patike", "Dečije čizme", "Muške cipele"
          if (text.match(/^(Ženske|Zenske|Muške|Muske|Dečije|Decije|Dečje|Decje|Unisex)\\s+(patike|cipele|čizme|cizme|sandale|papuče|papuce|japanke|mokasine|gležnjače|gleznjace|baletanke|klompe|espadrile)/i)) {
            result.productType = text;
          }
        });
      }

      // Extract tags
      var tagElements = document.querySelectorAll('.tags .tag-item');
      tagElements.forEach(function(el) {
        var tag = el.textContent.trim().toLowerCase();
        if (tag && !result.tags.includes(tag)) {
          result.tags.push(tag);
        }
      });

      // Extract available sizes from size selector
      var sizeElements = document.querySelectorAll('.size-list .size-item:not(.unavailable), .sizes-wrapper .size:not(.unavailable)');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim();
        if (size && !el.classList.contains('unavailable')) {
          result.sizes.push(size);
        }
      });

      // Alternative: sizes from data attributes
      if (result.sizes.length === 0) {
        var sizeDataElements = document.querySelectorAll('[data-size]:not(.unavailable)');
        sizeDataElements.forEach(function(el) {
          var size = el.getAttribute('data-size') || el.textContent.trim();
          if (size) {
            result.sizes.push(size);
          }
        });
      }

      return result;
    })()
  `) as Promise<ProductDetails>;
}

function parseProductType(productType: string): { gender: Gender | null; category: string | null } {
  if (!productType) return { gender: null, category: null };

  const normalized = productType.toUpperCase();
  let gender: Gender | null = null;
  let category: string | null = null;

  // Find gender
  for (const [prefix, g] of Object.entries(GENDER_MAP)) {
    if (normalized.includes(prefix)) {
      gender = g;
      break;
    }
  }

  // Find category
  for (const [type, cat] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(type)) {
      category = cat;
      break;
    }
  }

  return { gender, category };
}

async function scrapeOfficeShoeDetails(): Promise<void> {
  console.log("Starting Office Shoes detail scraper...");

  // Get deals that need details
  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  const browser = await launchBrowser();
  let processed = 0;
  let errors = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const deal of deals) {
      console.log(`\n[${processed + 1}/${deals.length}] ${deal.name}`);
      console.log(`  URL: ${deal.url}`);

      try {
        await page.goto(deal.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        await sleep(1000 + Math.random() * 1000);

        const details = await extractProductDetails(page);
        console.log(`  Product type: ${details.productType || "not found"}`);
        console.log(`  Tags: ${details.tags.length > 0 ? details.tags.slice(0, 5).join(", ") : "none"}`);
        console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);

        // Parse product type to get gender and category
        const { gender, category } = parseProductType(details.productType || "");
        console.log(`  Parsed gender: ${gender || "unknown"}`);
        console.log(`  Parsed category: ${category || "unknown"}`);

        // Build categories array
        const categories: string[] = [];
        if (category) {
          categories.push(category);
        }
        // Add relevant tags as categories
        for (const tag of details.tags) {
          if (tag === "patike" || tag === "cipele" || tag === "cizme") {
            const mapped = CATEGORY_MAP[tag.toUpperCase()];
            if (mapped && !categories.includes(mapped)) {
              categories.push(mapped);
            }
          }
        }

        // Update deal in database
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          categories,
          gender: gender || undefined,
        });

        processed++;
        console.log(`  ✓ Updated`);

        // Random delay between requests
        await sleep(1500 + Math.random() * 1500);

      } catch (err) {
        errors++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ Error: ${message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== Detail Scraping Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('officeshoes-details.ts')) {
  scrapeOfficeShoeDetails().catch(console.error);
}

export { scrapeOfficeShoeDetails };
