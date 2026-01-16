import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

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
  categories: string[];
  gender: Gender | null;
}

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var result = {
        sizes: [],
        categories: [],
        gender: null
      };

      // Extract sizes from size selector
      var sizeElements = document.querySelectorAll('.size-btn:not(.out-of-stock), .size-item:not(.unavailable), [data-size]:not(.out-of-stock)');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || el.getAttribute('data-size') || '';
        if (size && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      // Extract category from breadcrumbs or product info
      var breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a');
      breadcrumbs.forEach(function(el) {
        var text = el.textContent.trim().toLowerCase();
        if (text.includes('patike')) result.categories.push('obuca/patike');
        else if (text.includes('odeca')) result.categories.push('odeca');
        else if (text.includes('oprema')) result.categories.push('oprema');
      });

      // Try to get gender from URL or page content
      var url = window.location.href.toLowerCase();
      var pageText = document.body.innerText.toLowerCase();

      if (url.includes('-men') || url.includes('/muski') || pageText.includes('muški') || pageText.includes('muske patike')) {
        result.gender = 'muski';
      } else if (url.includes('-women') || url.includes('/zenski') || pageText.includes('ženski') || pageText.includes('zenske patike')) {
        result.gender = 'zenski';
      } else if (url.includes('-kids') || url.includes('/deciji') || pageText.includes('dečiji') || pageText.includes('decije patike')) {
        result.gender = 'deciji';
      }

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeBuzzDetails(): Promise<void> {
  console.log("Starting Buzz Sneakers detail scraper...");

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
          timeout: 30000,
        });

        await sleep(1000 + Math.random() * 1000);

        const details = await extractProductDetails(page);
        console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);
        console.log(`  Categories: ${details.categories.join(", ") || "none"}`);
        console.log(`  Gender: ${details.gender || "not detected"}`);

        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          categories: details.categories,
          gender: details.gender || undefined,
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

// Run
scrapeBuzzDetails().catch(console.error);

export { scrapeBuzzDetails };
