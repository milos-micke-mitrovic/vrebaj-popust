import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, Store } from "../db-writer";
import * as fs from "fs";
import * as path from "path";

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const STORE: Store = "djaksport";
const BASE_URL = "https://www.djaksport.com";
const AKCIJA_URL = `${BASE_URL}/akcija`;
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

// Price parsing - handles Serbian format "12.990,00 RSD"
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
      var items = document.querySelectorAll('.item.product.product-item');

      items.forEach(function(el) {
        var linkEl = el.querySelector('.product-item-link');
        var name = linkEl ? linkEl.textContent.trim() : '';
        var url = linkEl ? linkEl.href : '';

        var imgEl = el.querySelector('.product-image-photo');
        var imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';

        var oldPriceEl = el.querySelector('.old-price .price');
        var originalPrice = oldPriceEl ? oldPriceEl.textContent.trim() : '';

        var newPriceEl = el.querySelector('.normal-price .price');
        var salePrice = newPriceEl ? newPriceEl.textContent.trim() : '';

        var discountEl = el.querySelector('.discount-badge span, .discount-percentage');
        var discountFromSite = null;
        if (discountEl) {
          var match = discountEl.textContent.match(/(\\d+)/);
          if (match) discountFromSite = parseInt(match[1], 10);
        }

        var brand = null;
        var nameParts = name.split(' ');
        if (nameParts.length > 0 && nameParts[0] === nameParts[0].toUpperCase()) {
          brand = nameParts[0];
        }

        if (name && url) {
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
        var maxScrolls = 20;
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

async function getNextPageUrl(page: Page): Promise<string | null> {
  return page.evaluate(`
    (function() {
      var nextLink = document.querySelector('a.action.next, link[rel="next"]');
      if (nextLink && nextLink.href) {
        return nextLink.href;
      }
      return null;
    })()
  `) as Promise<string | null>;
}

async function scrapeDjakSport(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;

  console.log("Starting DjakSport scraper with stealth mode...");
  console.log(`Target: ${AKCIJA_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });

    let currentUrl: string | null = AKCIJA_URL;
    let pageNum = 1;
    const maxPages = 10; // Try more pages with stealth

    while (currentUrl && pageNum <= maxPages) {
      console.log(`\nScraping page ${pageNum}: ${currentUrl}`);

      try {
        await page.goto(currentUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Random delay to appear more human
        await sleep(2000 + Math.random() * 2000);

        // Wait for products
        await page.waitForSelector(".item.product.product-item", {
          timeout: 15000,
        }).catch(() => {
          console.log("Timeout waiting for products, trying anyway...");
        });

        // Scroll like a human
        await autoScroll(page);
        await sleep(1000);

        // Check if we got blocked
        const isBlocked = await page.evaluate(`
          document.body.innerText.includes('blocked') ||
          document.body.innerText.includes('Cloudflare') ||
          document.title.includes('Just a moment')
        `);

        if (isBlocked) {
          console.log("Detected Cloudflare block, saving screenshot...");
          await page.screenshot({
            path: path.join(process.cwd(), "data", `blocked-page-${pageNum}.png`),
          });
          break;
        }

        const products = await extractProducts(page);
        console.log(`Found ${products.length} product elements`);

        if (products.length > 0 && pageNum === 1) {
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

        // Get next page
        currentUrl = await getNextPageUrl(page);
        if (!currentUrl && pageNum < maxPages) {
          currentUrl = `${AKCIJA_URL}?p=${pageNum + 1}`;
        }
        pageNum++;

        if (currentUrl && pageNum <= maxPages) {
          // Random delay between pages
          await sleep(3000 + Math.random() * 2000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Page ${pageNum}: ${message}`);
        console.error(`Error on page ${pageNum}:`, message);
        currentUrl = `${AKCIJA_URL}?p=${pageNum + 1}`;
        pageNum++;
        await sleep(3000);
      }
    }
  } finally {
    await browser.close();
  }

  // Log scrape run
  await logScrapeRun(STORE, totalScraped, totalDeals, errors);

  console.log("\n=== Scraping Complete ===");
  console.log(`Total scraped: ${totalScraped}`);
  console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }

  await disconnect();
}

// Run
scrapeDjakSport().catch(console.error);

export { scrapeDjakSport };
