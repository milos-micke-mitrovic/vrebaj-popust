import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE: Store = "planeta";
const BASE_URL = "https://planetasport.rs";
// Sale pages with lista parameter (may change - update as needed)
const SALE_PAGES = [
  { url: `${BASE_URL}/muskarci.html?lista=1369`, gender: "muski" as Gender },
  { url: `${BASE_URL}/zene.html?lista=1369`, gender: "zenski" as Gender },
  { url: `${BASE_URL}/deca.html?lista=1369`, gender: "deciji" as Gender },
];
const MIN_DISCOUNT = 50;
const MAX_PAGES = 50;

interface RawProduct {
  name: string;
  originalPrice: string;
  salePrice: string;
  url: string;
  imageUrl: string;
  brand: string | null;
  discountFromSite: number | null;
}

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr
    .replace(/RSD|din|€|\s|&nbsp;/gi, "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : Math.round(price);
}

function calcDiscount(original: number, sale: number): number {
  if (original <= 0 || sale <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

let idCounter = 0;
function generateId(url: string): string {
  const slug = url
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .slice(0, 80);
  idCounter++;
  return `${STORE}-${slug}-${idCounter}`;
}

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

async function extractProducts(page: Page): Promise<RawProduct[]> {
  return page.evaluate(`
    (function() {
      var results = [];
      var items = document.querySelectorAll('.product-item-info');

      items.forEach(function(el) {
        var linkEl = el.querySelector('a.product-item-photo') || el.querySelector('.product-item-name a');
        var url = linkEl ? linkEl.href : '';

        var nameEl = el.querySelector('.product-item-name a');
        var name = nameEl ? nameEl.textContent.trim() : '';

        var imgEl = el.querySelector('img.product-main-image');
        var imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';

        // Get prices from price-wrapp - use old-price and special-price (final price after all discounts)
        var oldPriceEl = el.querySelector('.price-wrapp .old-price');
        var specialPriceEl = el.querySelector('.price-wrapp .special-price');

        var originalPrice = oldPriceEl ? oldPriceEl.textContent.trim() : '';
        var salePrice = specialPriceEl ? specialPriceEl.textContent.trim() : '';

        // Don't use discount from site - calculate from prices instead for accuracy
        var discountFromSite = null;

        var brand = null;
        // Extract brand from product name (usually first word in caps)
        if (name) {
          var nameParts = name.split(' ');
          if (nameParts.length > 0 && nameParts[0] === nameParts[0].toUpperCase()) {
            brand = nameParts[0];
          }
        }

        if (name && url && url.includes('.html') && originalPrice && salePrice) {
          results.push({
            name: name,
            originalPrice: originalPrice,
            salePrice: salePrice,
            url: url,
            imageUrl: imageUrl,
            brand: brand,
            discountFromSite: discountFromSite
          });
        }
      });

      return results;
    })()
  `) as Promise<RawProduct[]>;
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(`
    (function() {
      return new Promise(function(resolve) {
        var totalHeight = 0;
        var distance = 500;
        var maxScrolls = 30;
        var scrollCount = 0;

        var timer = setInterval(function() {
          var scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    })()
  `);
}

async function scrapePlaneta(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting Planeta Sport scraper...");
  console.log(`Scraping ${SALE_PAGES.length} sections`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const salePage of SALE_PAGES) {
      console.log(`\n=== Scraping: ${salePage.url} (${salePage.gender}) ===`);

      let currentPage = 1;

      while (currentPage <= MAX_PAGES) {
        const pageUrl = currentPage === 1
          ? salePage.url
          : `${salePage.url}&p=${currentPage}`;

        console.log(`\nPage ${currentPage}: ${pageUrl}`);

        try {
          await page.goto(pageUrl, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });

          try {
            await page.waitForSelector(".product-item-info", { timeout: 15000 });
            console.log("Product grid loaded");
          } catch {
            console.log("No products found, ending pagination");
            break;
          }

          await sleep(2000 + Math.random() * 1000);
          await autoScroll(page);
          await sleep(1000);

          const products = await extractProducts(page);
          console.log(`Found ${products.length} products`);

          if (products.length === 0) {
            console.log("No products, ending pagination");
            break;
          }

          let pageDeals = 0;
          for (const product of products) {
            if (seenUrls.has(product.url)) continue;
            seenUrls.add(product.url);

            const originalPrice = parsePrice(product.originalPrice);
            const salePrice = parsePrice(product.salePrice);

            if (originalPrice <= 0 || salePrice <= 0) continue;
            if (salePrice >= originalPrice) continue;

            const discountPercent =
              product.discountFromSite || calcDiscount(originalPrice, salePrice);

            if (discountPercent >= MIN_DISCOUNT) {
              await upsertDeal({
                id: generateId(product.url),
                store: STORE,
                name: product.name,
                brand: product.brand,
                originalPrice,
                salePrice,
                discountPercent,
                url: product.url,
                imageUrl: product.imageUrl,
                gender: salePage.gender,
              });
              pageDeals++;
              totalDeals++;
            }
          }

          totalScraped += products.length;
          console.log(`Deals this page: ${pageDeals}, Total: ${totalDeals} (scraped: ${totalScraped})`);

          currentPage++;
          await sleep(2000 + Math.random() * 1000);

        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${salePage.gender} page ${currentPage}: ${message}`);
          console.error(`Error:`, message);
          break;
        }
      }
    }
  } finally {
    await browser.close();
  }

  // Log scrape run
  await logScrapeRun(STORE, totalScraped, totalDeals, errors);

  // Clean up stale products (only if we found enough products)
  await cleanupStaleProducts(STORE, scrapeStartTime, totalDeals);

  console.log("\n=== Scraping Complete ===");
  console.log(`Total scraped: ${totalScraped}`);
  console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('planeta.ts')) {
  scrapePlaneta().catch(console.error);
}

export { scrapePlaneta };
