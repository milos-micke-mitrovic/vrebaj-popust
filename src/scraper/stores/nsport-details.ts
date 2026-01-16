import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "nsport" as const;

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
      var sizeElements = document.querySelectorAll('.size-select option:not([disabled]), .product-size:not(.out-of-stock), .available-size');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || el.value || '';
        // Filter out placeholder options
        if (size && size !== 'Izaberi veličinu' && size !== '-' && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      // Extract category and gender from breadcrumbs or product attributes
      var breadcrumbs = document.querySelectorAll('.breadcrumb a, nav.breadcrumbs a');
      breadcrumbs.forEach(function(el) {
        var text = el.textContent.trim().toLowerCase();

        // Categories
        if (text.includes('patike')) result.categories.push('obuca/patike');
        else if (text.includes('cipele')) result.categories.push('obuca/cipele');
        else if (text.includes('čizme') || text.includes('cizme')) result.categories.push('obuca/cizme');
        else if (text.includes('sandale')) result.categories.push('obuca/sandale');
        else if (text.includes('majic')) result.categories.push('odeca/majice');
        else if (text.includes('duks')) result.categories.push('odeca/duksevi');
        else if (text.includes('jakn')) result.categories.push('odeca/jakne');
        else if (text.includes('šorc') || text.includes('sorc')) result.categories.push('odeca/sortevi');
        else if (text.includes('trenerka') || text.includes('trenerke')) result.categories.push('odeca/trenerke');

        // Gender
        if (text.includes('muš') || text.includes('mus') || text === 'muškarci') result.gender = 'muski';
        else if (text.includes('žen') || text.includes('zen') || text === 'žene') result.gender = 'zenski';
        else if (text.includes('deč') || text.includes('dec') || text.includes('deca')) result.gender = 'deciji';
      });

      // Check product title for gender
      var title = document.querySelector('h1, .product-title, .product-name');
      if (title && !result.gender) {
        var titleText = title.textContent.toLowerCase();
        if (titleText.includes('muš') || titleText.includes('muske')) result.gender = 'muski';
        else if (titleText.includes('žen') || titleText.includes('zenske')) result.gender = 'zenski';
        else if (titleText.includes('deč') || titleText.includes('decije')) result.gender = 'deciji';
      }

      // Remove duplicates
      result.categories = [...new Set(result.categories)];

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeNSportDetails(): Promise<void> {
  console.log("Starting N-Sport detail scraper...");

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
scrapeNSportDetails().catch(console.error);

export { scrapeNSportDetails };
