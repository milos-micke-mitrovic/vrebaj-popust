import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";
import * as fs from "fs";
import * as path from "path";

puppeteer.use(StealthPlugin());

const STORE: Store = "nsport";
const BASE_URL = "https://www.n-sport.net";

// Outlet page - contains all discounted products (~3227 products)
// URL format: filters[promo][0]=outlet&pg=N
const OUTLET_BASE = `${BASE_URL}/index.php?mod=catalog&op=browse&view=promo&filters%5Bpromo%5D%5B0%5D=outlet`;

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
      var items = document.querySelectorAll('.product[itemprop="itemListElement"]');

      items.forEach(function(el) {
        // Get product link
        var linkEl = el.querySelector('a[itemprop="url"]');
        var url = linkEl ? linkEl.href : '';

        // Get product name
        var nameEl = el.querySelector('.product-name a, h3.product-name a');
        var name = nameEl ? nameEl.textContent.trim() : '';

        // Get image
        var imgEl = el.querySelector('img.product-image[data-image-info="main-image"]');
        var imageUrl = '';
        if (imgEl) {
          imageUrl = imgEl.src || '';
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          }
        }

        // Get prices - N-Sport uses product-old-price and product-price
        var oldPriceEl = el.querySelector('.product-old-price, .promo-box-old-price');
        var newPriceEl = el.querySelector('.product-price:not(.product-old-price), .promo-box-price');

        var originalPrice = oldPriceEl ? oldPriceEl.textContent.trim() : '';
        var salePrice = newPriceEl ? newPriceEl.textContent.trim() : '';

        // Get discount badge
        var discountEl = el.querySelector('.discount-label, .promo-badge, [class*="discount"]');
        var discountFromSite = null;
        if (discountEl) {
          var match = discountEl.textContent.match(/(\\d+)/);
          if (match) discountFromSite = parseInt(match[1], 10);
        }

        // Get brand from meta tag
        var brandEl = el.querySelector('meta[itemprop="brand"]');
        var brand = brandEl ? brandEl.content : null;

        if (name && url && originalPrice && salePrice) {
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

async function scrapeNSport(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting N-Sport scraper with stealth mode...");
  console.log(`Scraping outlet: ${OUTLET_BASE}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let currentPage = 1;
    const maxPages = 100; // ~3227 products / 36 per page ≈ 90 pages

    while (currentPage <= maxPages) {
      const pageUrl = `${OUTLET_BASE}&pg=${currentPage}`;
      console.log(`\nScraping page ${currentPage}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        // Wait for products to load
        try {
          await page.waitForSelector('.product, .product-item', { timeout: 15000 });
          console.log("Product grid loaded");
        } catch {
          console.log("Waiting for product grid timed out, continuing...");
        }

        await sleep(2000 + Math.random() * 2000);
        await autoScroll(page);
        await sleep(2000);

        const products = await extractProducts(page);
        console.log(`Found ${products.length} product elements`);

        if (products.length === 0) {
          console.log("No products found, ending pagination");
          break;
        }

        if (products.length > 0 && currentPage === 1) {
          console.log("Sample product:", JSON.stringify(products[0], null, 2));
        }

        for (const product of products) {
          // Skip duplicates
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
              gender: "unisex",
            });
            totalDeals++;
          }
        }

        totalScraped += products.length;
        console.log(
          `Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals} (total scraped: ${totalScraped})`
        );

        currentPage++;
        await sleep(2000 + Math.random() * 1000);

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`page ${currentPage}: ${message}`);
        console.error(`Error on page ${currentPage}:`, message);
        break;
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

export { scrapeNSport };
