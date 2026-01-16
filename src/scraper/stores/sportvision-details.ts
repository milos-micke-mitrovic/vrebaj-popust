import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "sportvision" as const;

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

      // Extract sizes from size selector (SportVision uses data attributes)
      var sizeElements = document.querySelectorAll('.size-btn:not(.out-of-stock), .size-option:not(.disabled), [data-size-value]:not(.out-of-stock)');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || el.getAttribute('data-size-value') || '';
        if (size && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      // Extract category from breadcrumbs
      var breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a');
      breadcrumbs.forEach(function(el) {
        var text = el.textContent.trim().toLowerCase();

        // Categories
        if (text.includes('patike')) result.categories.push('obuca/patike');
        else if (text.includes('cipele')) result.categories.push('obuca/cipele');
        else if (text.includes('čizme') || text.includes('cizme')) result.categories.push('obuca/cizme');
        else if (text.includes('sandale')) result.categories.push('obuca/sandale');
        else if (text.includes('papuč') || text.includes('papuc')) result.categories.push('obuca/papuce');
        else if (text.includes('majic')) result.categories.push('odeca/majice');
        else if (text.includes('duks')) result.categories.push('odeca/duksevi');
        else if (text.includes('jakn')) result.categories.push('odeca/jakne');
        else if (text.includes('šorc') || text.includes('sorc')) result.categories.push('odeca/sortevi');
        else if (text.includes('trenerka') || text.includes('trenerke')) result.categories.push('odeca/trenerke');
        else if (text.includes('ranac') || text.includes('rančev')) result.categories.push('oprema/rancevi');
        else if (text.includes('torb')) result.categories.push('oprema/torbe');

        // Gender
        if (text.includes('muškarc') || text === 'muškarci') result.gender = 'muski';
        else if (text.includes('žen') || text === 'žene') result.gender = 'zenski';
        else if (text.includes('deč') || text.includes('dec') || text === 'deca') result.gender = 'deciji';
      });

      // Check product attributes for gender
      var genderAttr = document.querySelector('[data-gender], .product-gender');
      if (genderAttr) {
        var genderText = (genderAttr.textContent || genderAttr.getAttribute('data-gender') || '').toLowerCase();
        if (genderText.includes('muš') || genderText.includes('men')) result.gender = 'muski';
        else if (genderText.includes('žen') || genderText.includes('women')) result.gender = 'zenski';
        else if (genderText.includes('deč') || genderText.includes('kid')) result.gender = 'deciji';
      }

      // Check URL for gender hints
      var url = window.location.href.toLowerCase();
      if (!result.gender) {
        if (url.includes('/muskarci') || url.includes('/men')) result.gender = 'muski';
        else if (url.includes('/zene') || url.includes('/women')) result.gender = 'zenski';
        else if (url.includes('/deca') || url.includes('/kids')) result.gender = 'deciji';
      }

      // Remove duplicates
      result.categories = [...new Set(result.categories)];

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeSportVisionDetails(): Promise<void> {
  console.log("Starting SportVision detail scraper...");

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

// Run if executed directly
if (process.argv[1]?.includes('sportvision-details.ts')) {
  scrapeSportVisionDetails().catch(console.error);
}

export { scrapeSportVisionDetails };
