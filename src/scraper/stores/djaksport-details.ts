import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsForDetailScraping, updateDealDetails, deleteDealByUrl, disconnect, Gender } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";
import { mapGender } from "../../lib/gender-mapper";

puppeteer.use(StealthPlugin());

const STORE = "djaksport" as const;

// Stop well before the 180-minute CI job cap so the run exits cleanly; any deals
// not reached are picked up on the next run (they keep a null/stale
// detailsScrapedAt, so getDealsForDetailScraping returns them again, oldest first).
const MAX_RUNTIME_MS = 150 * 60 * 1000;

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
  sizes: string[];
  proizvod: string;
  pol: string;
  detailImageUrl: string | null;
}

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var sizes = [];
      // Size containers: old (.swatch-attribute.size) and new (.swatch-attribute-options
      // identified by an aria-labelledby pointing to a size label).
      var sizeContainers = new Set();
      document.querySelectorAll('.swatch-attribute.size').forEach(function(el) { sizeContainers.add(el); });
      document.querySelectorAll('.swatch-attribute-options[aria-labelledby*="size"]').forEach(function(el) { sizeContainers.add(el); });

      sizeContainers.forEach(function(container) {
        container.querySelectorAll('.swatch-option.text').forEach(function(el) {
          var size = el.getAttribute('data-option-label') || (el.textContent || '').trim();
          if (size && size.length <= 5 && /^[A-Za-z0-9.\\/]+$/.test(size)) {
            if (sizes.indexOf(size) === -1) sizes.push(size);
          }
        });
      });

      // Specifikacija table: rows of <td><strong>Label:</strong></td><td><p>Value</p></td>
      // We want Proizvod (e.g., "MAJICE") for category and Pol (e.g., "MUŠKARCI") for gender.
      var proizvod = '';
      var pol = '';
      document.querySelectorAll('.technical-specifications-option').forEach(function(row) {
        var labelEl = row.querySelector('td strong');
        var cells = row.querySelectorAll('td');
        if (labelEl && cells.length >= 2) {
          var label = (labelEl.textContent || '').trim();
          var value = (cells[1].textContent || '').trim();
          if (label.indexOf('Proizvod') !== -1) proizvod = value;
          if (label.indexOf('Pol') !== -1) pol = value;
        }
      });

      // Detail image (high-res from gallery). Djak pages have no separate textual
      // product description — the Specifikacija table is the only descriptive block.
      var detailImageUrl = null;
      var imgEl = document.querySelector('.gallery-placeholder img, .product.media img, main img.product-image-photo');
      if (imgEl) detailImageUrl = imgEl.src || null;

      return { sizes: sizes, proizvod: proizvod, pol: pol, detailImageUrl: detailImageUrl };
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeDjakSportDetails(): Promise<void> {
  console.log("Starting DjakSport detail scraper...");

  const deals = await getDealsForDetailScraping(STORE);
  console.log(`Found ${deals.length} deals to process`);

  if (deals.length === 0) {
    await disconnect();
    return;
  }

  const browser = await launchBrowser();
  const startTime = Date.now();
  let processed = 0;
  let deleted = 0;
  let errors = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const deal of deals) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`\nTime budget reached after ${processed}/${deals.length}; remaining deals will be processed on the next run.`);
        break;
      }

      console.log(`\n[${processed + 1}/${deals.length}] ${deal.name}`);

      try {
        await page.goto(deal.url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await sleep(1500 + Math.random() * 1000);

        const details = await extractProductDetails(page);
        console.log(`  sizes=${details.sizes.length} proizvod="${details.proizvod}" pol="${details.pol}"`);

        // Out-of-stock guard: only delete if it's footwear or clothing without sizes.
        // Accessories (hats, backpacks, balls, etc.) legitimately have no sizes — keep them.
        if (details.sizes.length === 0) {
          const cat = mapCategory(deal.name + " " + deal.url + " " + details.proizvod);
          if (cat && (cat.startsWith("obuca/") || cat.startsWith("odeca/"))) {
            await deleteDealByUrl(deal.url);
            deleted++;
            console.log(`  ✗ Deleted (footwear/clothing with no sizes)`);
            processed++;
            await sleep(1000 + Math.random() * 1000);
            continue;
          }
        }

        const cat = mapCategory(details.proizvod + " " + deal.name);
        const categories = cat ? [cat] : undefined;
        const gender: Gender | undefined = details.pol ? (mapGender(details.pol) || "unisex") : undefined;

        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          ...(categories && { categories }),
          ...(gender && { gender }),
          ...(details.detailImageUrl && { detailImageUrl: details.detailImageUrl }),
        });

        processed++;
        console.log(`  ✓ Updated`);
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
  console.log(`Deleted (no sizes): ${deleted}`);
  console.log(`Errors: ${errors}`);

  await disconnect();
}

if (process.argv[1]?.includes("djaksport-details.ts")) {
  scrapeDjakSportDetails().catch(console.error);
}

export { scrapeDjakSportDetails };
