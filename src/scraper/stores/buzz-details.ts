import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsForDetailScraping, updateDealDetails, deleteDealByUrl, disconnect } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";

puppeteer.use(StealthPlugin());

const STORE = "buzz" as const;

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
}

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var result = {
        sizes: []
      };

      // Extract sizes from Buzz size selector
      // Buzz uses: <li data-productsize-name="5-" class="ease">38 2/3</li>
      // data-productsize-name has US sizes, text content has EU sizes — we want EU
      // Out of stock sizes have class "disabled"
      var sizeElements = document.querySelectorAll('li[data-productsize-name]:not(.disabled)');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || '';
        if (size && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeBuzzDetails(): Promise<void> {
  console.log("Starting Buzz Sneakers detail scraper...");

  const deals = await getDealsForDetailScraping(STORE);
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

        // Extract category using shared mapper
        const cat = mapCategory(deal.name + " " + deal.url);
        const categories = cat ? [cat] : [];

        console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);
        console.log(`  Categories: ${categories.join(", ") || "none (keeping existing)"}`);

        if (details.sizes.length === 0) {
          if (cat && (cat.startsWith("obuca/") || cat.startsWith("odeca/"))) {
            await deleteDealByUrl(deal.url);
            console.log(`  ✗ Deleted (no sizes available)`);
            continue;
          }
        }

        // Only update sizes and categories (don't overwrite gender - it's set correctly by list scraper)
        // Only update categories if we extracted some
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          ...(categories.length > 0 && { categories }),
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
  console.log(`Errors: ${errors}`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('buzz-details.ts')) {
  scrapeBuzzDetails().catch(console.error);
}

export { scrapeBuzzDetails };
