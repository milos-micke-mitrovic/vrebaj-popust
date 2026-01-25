import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE: Store = "officeshoes";
const BASE_URL = "https://www.officeshoes.rs";
const SALE_PATH = "/sale/0/48/discount_desc/";
const MIN_DISCOUNT = 50;
const MAX_PAGES = 15; // Safety limit

interface RawProduct {
  name: string;
  originalPrice: string;
  salePrice: string;
  url: string;
  imageUrl: string;
  brand: string | null;
  discountPercent: number | null;
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

function generateId(url: string): string {
  // Use URL path only (without domain) for deterministic IDs
  const pathOnly = url
    .replace(/https?:\/\/[^\/]+/, "")  // Remove domain completely
    .replace(/\.html?$/i, "")  // Remove .html or .htm extension
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")  // Collapse multiple dashes
    .replace(/^-|-$/g, "")  // Trim leading/trailing dashes
    .slice(0, 80);
  return `${STORE}-${pathOnly}`;
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
      var items = document.querySelectorAll('.product-article_wrapper, article[data-product_id]');

      items.forEach(function(el) {
        // Get product link - use send-search class or data-product_id to avoid brand logo links
        var linkEl = el.querySelector('a.send-search, a[data-product_id]');
        var url = linkEl ? linkEl.href : '';

        // Get product name from h2 or title
        var nameEl = el.querySelector('h2, .product-name, .product-title');
        var name = nameEl ? nameEl.textContent.trim() : '';

        // Get brand from data attribute or brand logo
        var brand = el.dataset.brand || null;
        if (!brand) {
          var brandImg = el.querySelector('img[src*="brandlogos"]');
          if (brandImg) {
            var brandMatch = brandImg.src.match(/brandlogos\\/([^.]+)/);
            if (brandMatch) brand = brandMatch[1].toUpperCase();
          }
        }

        // Get image
        var imgEl = el.querySelector('img.product_item_img, img[src*="/products/"]');
        var imageUrl = '';
        if (imgEl) {
          imageUrl = imgEl.src || imgEl.dataset.src || '';
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.officeshoes.rs' + imageUrl;
          }
        }

        // Get prices
        var oldPriceEl = el.querySelector('.old-price');
        var newPriceEl = el.querySelector('.price:not(.old-price)');
        var originalPrice = oldPriceEl ? oldPriceEl.textContent.trim() : '';
        var salePrice = newPriceEl ? newPriceEl.textContent.trim() : '';

        // Get discount from badge image (e.g., ssrs50.png = -50%)
        var discountPercent = null;
        var discountImg = el.querySelector('img[src*="ssrs"]');
        if (discountImg) {
          var discountMatch = discountImg.src.match(/ssrs(\\d+)/);
          if (discountMatch) discountPercent = parseInt(discountMatch[1], 10);
        }

        if (name && url) {
          results.push({
            name: name,
            originalPrice: originalPrice,
            salePrice: salePrice,
            url: url,
            imageUrl: imageUrl,
            brand: brand,
            discountPercent: discountPercent
          });
        }
      });

      return results;
    })()
  `) as Promise<RawProduct[]>;
}

async function scrapeOfficeShoes(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting Office Shoes scraper with stealth mode...");
  console.log(`Min discount: ${MIN_DISCOUNT}%`);
  console.log("Using pagination to load all products");

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let currentPage = 0;
    let foundBelowMinDiscount = false;

    while (currentPage < MAX_PAGES && !foundBelowMinDiscount) {
      const pageNum = currentPage + 1;
      const pageUrl = `${BASE_URL}${SALE_PATH}?page=${pageNum}`;

      console.log(`\n=== Page ${pageNum}: ${pageUrl} ===`);

      await page.goto(pageUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Wait for products to load
      try {
        await page.waitForSelector('.product-article_wrapper, article[data-product_id]', { timeout: 15000 });
      } catch {
        console.log("No products found on this page, stopping");
        break;
      }

      await sleep(1000);

      const products = await extractProducts(page);
      console.log(`Found ${products.length} products on page ${pageNum}`);

      if (products.length === 0) {
        console.log("No products on page, stopping");
        break;
      }

      if (currentPage === 0 && products.length > 0) {
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
          product.discountPercent || calcDiscount(originalPrice, salePrice);

        // Since sorted by discount desc, stop when we hit < MIN_DISCOUNT
        if (discountPercent < MIN_DISCOUNT) {
          console.log(`Reached product with ${discountPercent}% discount, stopping`);
          foundBelowMinDiscount = true;
          break;
        }

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

      console.log(`Running total: ${totalDeals} deals (${totalScraped} scraped)`);

      currentPage++;

      // Small delay between pages
      if (!foundBelowMinDiscount && currentPage < MAX_PAGES) {
        await sleep(1500 + Math.random() * 1000);
      }
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    console.error("Error:", message);
  } finally {
    await browser.close();
  }

  // Log scrape run
  await logScrapeRun(STORE, totalScraped, totalDeals, errors);

  // Clean up stale products
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
if (process.argv[1]?.includes('officeshoes.ts') && !process.argv[1]?.includes('details')) {
  scrapeOfficeShoes().catch(console.error);
}

export { scrapeOfficeShoes };
