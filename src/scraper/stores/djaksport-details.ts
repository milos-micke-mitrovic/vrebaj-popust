import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "djaksport" as const;

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

      // Extract sizes from size selector (Magento style)
      var sizeElements = document.querySelectorAll('.swatch-option.text:not(.disabled), .size-option:not(.out-of-stock), [data-option-label]');
      sizeElements.forEach(function(el) {
        var size = el.textContent.trim() || el.getAttribute('data-option-label') || '';
        if (size && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      // Extract category from breadcrumbs
      var breadcrumbs = document.querySelectorAll('.breadcrumbs a, .breadcrumb-item a');
      var categoryParts = [];
      breadcrumbs.forEach(function(el) {
        var text = el.textContent.trim().toLowerCase();
        if (text.includes('patike')) categoryParts.push('obuca/patike');
        else if (text.includes('cipele')) categoryParts.push('obuca/cipele');
        else if (text.includes('odeca') || text.includes('odeća')) categoryParts.push('odeca');
        else if (text.includes('oprema')) categoryParts.push('oprema');
        else if (text.includes('muš') || text.includes('mus')) result.gender = 'muski';
        else if (text.includes('žen') || text.includes('zen')) result.gender = 'zenski';
        else if (text.includes('deč') || text.includes('dec') || text.includes('deca')) result.gender = 'deciji';
      });

      if (categoryParts.length > 0) {
        result.categories = [...new Set(categoryParts)];
      }

      // Try product name for gender hints
      var productName = document.querySelector('.page-title, h1.product-name');
      if (productName) {
        var name = productName.textContent.toLowerCase();
        if (!result.gender) {
          if (name.includes('muš') || name.includes('muske')) result.gender = 'muski';
          else if (name.includes('žen') || name.includes('zenske')) result.gender = 'zenski';
          else if (name.includes('deč') || name.includes('decije')) result.gender = 'deciji';
        }
      }

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeDjakSportDetails(): Promise<void> {
  console.log("Starting DjakSport detail scraper...");

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
scrapeDjakSportDetails().catch(console.error);

export { scrapeDjakSportDetails };
