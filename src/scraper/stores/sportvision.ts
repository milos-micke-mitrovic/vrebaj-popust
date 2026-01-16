import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";
import * as fs from "fs";
import * as path from "path";

puppeteer.use(StealthPlugin());

const STORE: Store = "sportvision";
const BASE_URL = "https://www.sportvision.rs";
// Outlet page - contains all discounted products
const OUTLET_URL = `${BASE_URL}/proizvodi/outlet-ponuda`;
const MIN_DISCOUNT = 50;

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
      var items = document.querySelectorAll('.product-item[data-productid]');

      items.forEach(function(el) {
        // Get data from attributes
        var name = el.dataset.productname || '';
        var salePrice = el.dataset.productprice || '';
        var originalPrice = el.dataset.productprevprice || '';
        var discountFromSite = el.dataset.productdiscount ? parseInt(el.dataset.productdiscount, 10) : null;
        var brand = el.dataset.productbrand || null;

        // Get product link
        var linkEl = el.querySelector('a.product-link') || el.querySelector('a[href*="sportvision.rs"]');
        var url = linkEl ? linkEl.href : '';

        // Get image
        var imgEl = el.querySelector('img.img-responsive');
        var imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
        // Make sure it's absolute URL
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = 'https://www.sportvision.rs' + imageUrl;
        }

        if (name && url && originalPrice && salePrice) {
          results.push({
            name: name.trim(),
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

async function scrapeSportVision(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting SportVision scraper with stealth mode...");
  console.log(`Scraping outlet page: ${OUTLET_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`\n=== Scraping: ${OUTLET_URL} ===`);

    try {
      await page.goto(OUTLET_URL, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Wait for products to load
      try {
        await page.waitForSelector('.product-item', { timeout: 15000 });
        console.log("Product grid loaded");
      } catch {
        console.log("Waiting for product grid timed out, continuing...");
      }

      await sleep(2000 + Math.random() * 2000);

      // Save debug screenshot
      await page.screenshot({
        path: path.join(process.cwd(), "data", "sportvision-page-1.png"),
      });
      const html = await page.content();
      fs.writeFileSync(
        path.join(process.cwd(), "data", "sportvision-page-1.html"),
        html
      );
      console.log("Saved debug screenshot and HTML");

      // Click "Load more" button until all products are loaded
      let loadMoreClicks = 0;
      const maxClicks = 200; // 160 pages on outlet

      while (loadMoreClicks < maxClicks) {
        // Look for load more button - SportVision uses .next-load-btn
        const loadMoreBtn = await page.$('.next-load-btn, a.next-load-btn');

        if (!loadMoreBtn) {
          console.log("No 'Load more' button found");
          break;
        }

        const isVisible = await page.evaluate((btn) => {
          const style = window.getComputedStyle(btn as Element);
          const rect = (btn as Element).getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
        }, loadMoreBtn);

        if (!isVisible) {
          console.log("'Load more' button is hidden, all products loaded");
          break;
        }

        const productCountBefore = await page.evaluate(() =>
          document.querySelectorAll('.product-item[data-productid]').length
        );

        try {
          // Scroll button into view first
          await page.evaluate((btn) => {
            (btn as Element).scrollIntoView({ behavior: 'instant', block: 'center' });
          }, loadMoreBtn);
          await sleep(500);

          // Click using JavaScript to ensure it triggers
          await page.evaluate((btn) => {
            (btn as HTMLElement).click();
          }, loadMoreBtn);

          loadMoreClicks++;

          // Wait for network activity to settle
          await sleep(1500 + Math.random() * 500);

          // Wait for product count to change
          let retries = 0;
          let productCountAfter = productCountBefore;
          while (retries < 5 && productCountAfter === productCountBefore) {
            await sleep(500);
            productCountAfter = await page.evaluate(() =>
              document.querySelectorAll('.product-item[data-productid]').length
            );
            retries++;
          }

          if (productCountAfter === productCountBefore) {
            console.log("No new products loaded after retries, stopping");
            break;
          }

          console.log(`Clicked 'Load more' (${loadMoreClicks}): ${productCountBefore} -> ${productCountAfter}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(`Error clicking load more: ${message}`);
          break;
        }
      }

      // Now extract all products
      const products = await extractProducts(page);
      console.log(`Found ${products.length} total product elements`);

      if (products.length > 0) {
        console.log("Sample product:", JSON.stringify(products[0], null, 2));
      }

      for (const product of products) {
        // Skip duplicates
        if (seenUrls.has(product.url)) continue;
        seenUrls.add(product.url);

        totalScraped++;

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
            gender: "unisex",
          });
          totalDeals++;
        }
      }

      console.log(
        `Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals} (total scraped: ${totalScraped})`
      );

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`outlet: ${message}`);
      console.error(`Error scraping outlet:`, message);
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

// Run
scrapeSportVision().catch(console.error);

export { scrapeSportVision };
