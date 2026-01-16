import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "planeta" as const;

// Map Planeta's Pol values to our Gender type
const GENDER_MAP: Record<string, Gender> = {
  "MUSKARCI": "muski",
  "MUŠKARCI": "muski",
  "ZENE": "zenski",
  "ŽENE": "zenski",
  "DEČACI": "deciji",
  "DECACI": "deciji",
  "DEVOJČICE": "deciji",
  "DEVOJCICE": "deciji",
  "DECA": "deciji",
  "UNISEX": "unisex",
};

// Map Planeta's Vrsta values to our category system
const CATEGORY_MAP: Record<string, string> = {
  // Footwear
  "PATIKE": "obuca/patike",
  "CIPELE": "obuca/cipele",
  "ČIZME": "obuca/cizme",
  "CIZME": "obuca/cizme",
  "PAPUČE": "obuca/papuce",
  "PAPUCE": "obuca/papuce",
  "SANDALE": "obuca/sandale",
  "JAPANKE": "obuca/japanke",

  // Tops
  "MAJICE KRATAK RUKAV": "odeca/majice",
  "MAJICE DUGIH RUKAVA": "odeca/majice",
  "MAJICE": "odeca/majice",
  "DUKSEVI": "odeca/duksevi",
  "DUKSERICE": "odeca/duksevi",
  "JAKNE": "odeca/jakne",
  "PRSLUCI": "odeca/prsluci",
  "VETROVKE": "odeca/vetrovke",

  // Bottoms
  "PANTALONE": "odeca/pantalone",
  "TRENERKE": "odeca/trenerke",
  "DONJI DELOVI TRENERKI": "odeca/trenerke",
  "GORNJI DELOVI TRENERKI": "odeca/duksevi",
  "HELANKE": "odeca/helanke",
  "ŠORTEVI": "odeca/sortevi",
  "SORTEVI": "odeca/sortevi",
  "BERMUDE": "odeca/sortevi",

  // Swimwear
  "KUPAĆI KOSTIMI": "odeca/kupaci",
  "KUPACI KOSTIMI": "odeca/kupaci",

  // Accessories
  "KAPE": "oprema/kape",
  "KAČKETI": "oprema/kacketi",
  "KACKETI": "oprema/kacketi",
  "ČARAPE": "oprema/carape",
  "CARAPE": "oprema/carape",
  "TORBE": "oprema/torbe",
  "RANČEVI": "oprema/rancevi",
  "RANCEVI": "oprema/rancevi",
  "RUKAVICE": "oprema/rukavice",
  "ŠALOVI": "oprema/salovi",
  "SALOVI": "oprema/salovi",
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
  brand: string | null;
  gender: Gender | null;
  categories: string[];
  sport: string | null;
  sizes: string[];
}

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var result = {
        brand: null,
        gender: null,
        categories: [],
        sport: null,
        sizes: []
      };

      // Extract from Specifikacija table
      var table = document.querySelector('#product-attribute-specs-table');
      if (table) {
        var rows = table.querySelectorAll('tr');
        rows.forEach(function(row) {
          var label = row.querySelector('th');
          var value = row.querySelector('td');
          if (label && value) {
            var labelText = label.textContent.trim().toUpperCase();
            var valueText = value.textContent.trim().toUpperCase();

            if (labelText === 'BREND') {
              // Get brand from link if available, otherwise from text
              var brandLink = value.querySelector('a');
              result.brand = brandLink ? brandLink.textContent.trim() : value.textContent.trim();
            } else if (labelText === 'POL') {
              result.gender = valueText;
            } else if (labelText === 'VRSTA') {
              result.categories.push(valueText);
            } else if (labelText === 'SPORT') {
              result.sport = valueText;
            }
          }
        });
      }

      // Extract sizes from size selector
      var sizeElements = document.querySelectorAll('.swatch-attribute.size .swatch-option, .size-option:not(.unavailable), [data-option-type="size"]');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || el.getAttribute('data-option-label') || '';
        if (size && !el.classList.contains('unavailable') && !el.classList.contains('disabled')) {
          result.sizes.push(size);
        }
      });

      // Alternative size extraction - from dropdown
      if (result.sizes.length === 0) {
        var sizeSelect = document.querySelector('select[id*="size"], select[name*="size"]');
        if (sizeSelect) {
          var options = sizeSelect.querySelectorAll('option');
          options.forEach(function(opt) {
            var size = opt.textContent.trim();
            if (size && opt.value && !opt.disabled) {
              result.sizes.push(size);
            }
          });
        }
      }

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapePlanetaDetails(): Promise<void> {
  console.log("Starting Planeta Sport detail scraper...");

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
        console.log(`  Brand: ${details.brand}`);
        console.log(`  Gender: ${details.gender}`);
        console.log(`  Categories: ${details.categories.join(", ") || "none"}`);
        console.log(`  Sport: ${details.sport}`);
        console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);

        // Map gender
        const mappedGender = details.gender ? GENDER_MAP[details.gender] || null : null;

        // Map categories
        const mappedCategories: string[] = [];
        for (const cat of details.categories) {
          const mapped = CATEGORY_MAP[cat];
          if (mapped) {
            mappedCategories.push(mapped);
          }
        }
        // Add sport as category if available
        if (details.sport) {
          mappedCategories.push(`sport/${details.sport.toLowerCase()}`);
        }

        // Update deal in database
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          categories: mappedCategories,
          gender: mappedGender || undefined,
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
if (process.argv[1]?.includes('planeta-details.ts')) {
  scrapePlanetaDetails().catch(console.error);
}

export { scrapePlanetaDetails };
