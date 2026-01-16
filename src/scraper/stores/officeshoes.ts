import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";
import * as fs from "fs";
import * as path from "path";

puppeteer.use(StealthPlugin());

const STORE: Store = "officeshoes";
const BASE_URL = "https://www.officeshoes.rs";
// Single sale page sorted by discount descending
const SALE_URL = `${BASE_URL}/sale/0/48/discount_desc/`;
const MIN_DISCOUNT = 50;

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
  console.log(`Sale URL: ${SALE_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);
  console.log("Products are sorted by discount (highest first)");

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`\n=== Scraping: ${SALE_URL} ===`);
    let foundBelowMinDiscount = false;

    await page.goto(SALE_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait for products to load
    try {
      await page.waitForSelector('.product-article_wrapper, article[data-product_id]', { timeout: 15000 });
      console.log("Product grid loaded");
    } catch {
      console.log("Waiting for product grid timed out, continuing...");
    }

    await sleep(2000);

    // Save debug screenshot
    await page.screenshot({
      path: path.join(process.cwd(), "data", "officeshoes-page-1.png"),
    });
    console.log("Saved debug screenshot");

    // Click "Load more" button until we hit products < 50% discount
    let loadMoreClicks = 0;
    const maxClicks = 50; // Safety limit

    while (loadMoreClicks < maxClicks && !foundBelowMinDiscount) {
      const loadMoreBtn = await page.$('#loadMoreButton');

      if (!loadMoreBtn) {
        console.log("No more 'Load more' button found");
        break;
      }

      const isVisible = await page.evaluate((btn) => {
        const style = window.getComputedStyle(btn as Element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, loadMoreBtn);

      if (!isVisible) {
        console.log("'Load more' button is hidden, all products loaded");
        break;
      }

      const productCountBefore = await page.evaluate(() =>
        document.querySelectorAll('.product-article_wrapper, article[data-product_id]').length
      );

      try {
        await loadMoreBtn.click();
        loadMoreClicks++;
        console.log(`Clicked 'Load more' (${loadMoreClicks}), waiting for products...`);
        await sleep(2000 + Math.random() * 1000);

        const productCountAfter = await page.evaluate(() =>
          document.querySelectorAll('.product-article_wrapper, article[data-product_id]').length
        );

        if (productCountAfter === productCountBefore) {
          console.log("No new products loaded, stopping");
          break;
        }

        console.log(`Products: ${productCountBefore} -> ${productCountAfter}`);

        // Check if latest products are below min discount
        const latestProducts = await page.evaluate(`
          (function() {
            var items = document.querySelectorAll('.product-article_wrapper, article[data-product_id]');
            var lastItems = Array.from(items).slice(-10);
            var discounts = [];
            lastItems.forEach(function(el) {
              var discountImg = el.querySelector('img[src*="ssrs"]');
              if (discountImg) {
                var match = discountImg.src.match(/ssrs(\\d+)/);
                if (match) discounts.push(parseInt(match[1], 10));
              }
            });
            return discounts;
          })()
        `) as number[];

        if (latestProducts.length > 0) {
          const minInBatch = Math.min(...latestProducts);
          console.log(`Latest batch discounts: ${latestProducts.join(', ')}% (min: ${minInBatch}%)`);
          if (minInBatch < MIN_DISCOUNT) {
            console.log(`Found products below ${MIN_DISCOUNT}%, stopping load more`);
            foundBelowMinDiscount = true;
          }
        }

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
        product.discountPercent || calcDiscount(originalPrice, salePrice);

      // Since sorted by discount desc, stop when we hit < MIN_DISCOUNT
      if (discountPercent < MIN_DISCOUNT) {
        console.log(`Reached product with ${discountPercent}% discount, stopping`);
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
        gender: "unisex", // Will be updated by detail scraper
      });
      totalDeals++;
    }

    console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals} (total scraped: ${totalScraped})`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    console.error("Error:", message);
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
scrapeOfficeShoes().catch(console.error);

export { scrapeOfficeShoes };
