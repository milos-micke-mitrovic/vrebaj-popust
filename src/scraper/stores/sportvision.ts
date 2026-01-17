import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE: Store = "sportvision";
const BASE_URL = "https://www.sportvision.rs";
// Outlet page with pagination - /page-1, /page-2, etc.
const OUTLET_URL = `${BASE_URL}/proizvodi/outlet-ponuda`;
const MIN_DISCOUNT = 50;
const MAX_PAGES = 200;

interface RawProduct {
  name: string;
  originalPrice: number;
  salePrice: number;
  url: string;
  imageUrl: string;
  brand: string | null;
  discountPercent: number;
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

async function fetchPageProducts(page: Page, pageNum: number): Promise<{ products: RawProduct[]; hasMore: boolean }> {
  const url = `${OUTLET_URL}/page-${pageNum}`;

  const result = await page.evaluate(`
    (async function() {
      try {
        const response = await fetch('${url}', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'text/html, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (!response.ok) {
          return { products: [], hasMore: false };
        }

        var html = await response.text();

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        var results = [];
        // Look for product items - SportVision uses .product-item or similar
        var items = doc.querySelectorAll('.product-item, .product-box, [class*="product"]');

        // If no items with those classes, try to find product links
        if (items.length === 0) {
          items = doc.querySelectorAll('a[href*="/proizvod/"]');
        }

        items.forEach(function(el) {
          // Try to get product container
          var container = el.closest('.product-item') || el.closest('.product-box') || el;

          // Get product link and name
          var linkEl = container.querySelector('a[href*="/proizvod/"]') || container.querySelector('a.product-link');
          if (!linkEl && el.tagName === 'A' && el.href && el.href.includes('/proizvod/')) {
            linkEl = el;
          }
          var url = linkEl ? linkEl.href : '';
          var name = '';

          // Try different name selectors
          var nameEl = container.querySelector('.product-name, .product-title, h3, h4');
          if (nameEl) {
            name = nameEl.textContent.trim();
          } else if (linkEl) {
            name = linkEl.textContent.trim() || linkEl.getAttribute('title') || '';
          }

          // Get image
          var imgEl = container.querySelector('img');
          var imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
          if (imageUrl && imageUrl.startsWith('/')) {
            imageUrl = 'https://www.sportvision.rs' + imageUrl;
          }

          // Get prices from the new structure
          // Old price: .prev-price.prev-old-price.prev-price-third (prethodna cena - original price)
          // Current price: .current-price .value
          var salePriceEl = container.querySelector('.current-price .value');
          var salePrice = salePriceEl ? salePriceEl.textContent.trim() : '';

          // Original price - look for prev-old-price first (prethodna cena), then prev-price
          var originalPriceEl = container.querySelector('.prev-price.prev-old-price.prev-price-third') ||
                                container.querySelector('.prev-price.prev-old-price') ||
                                container.querySelector('.prev-price');
          var originalPrice = '';
          if (originalPriceEl) {
            // Get text but exclude the RSD span content duplication
            var priceText = originalPriceEl.childNodes[0];
            originalPrice = priceText ? priceText.textContent.trim() : originalPriceEl.textContent.replace('RSD', '').trim();
          }

          // Get discount from badge
          var discountEl = container.querySelector('.product-discount, [class*="discount-"]');
          var discountPercent = 0;
          if (discountEl) {
            var match = discountEl.textContent.match(/(\\d+)/);
            if (match) discountPercent = parseInt(match[1], 10);
          }

          // Get brand from data attribute or meta
          var brand = container.dataset ? container.dataset.productbrand : null;
          if (!brand) {
            var brandEl = container.querySelector('.brand, .product-brand');
            brand = brandEl ? brandEl.textContent.trim() : null;
          }

          // Also try data attributes if available
          if (!name && container.dataset && container.dataset.productname) {
            name = container.dataset.productname;
          }
          if (!salePrice && container.dataset && container.dataset.productprice) {
            salePrice = container.dataset.productprice;
          }
          if (!originalPrice && container.dataset && container.dataset.productprevprice) {
            originalPrice = container.dataset.productprevprice;
          }
          if (!discountPercent && container.dataset && container.dataset.productdiscount) {
            discountPercent = parseInt(container.dataset.productdiscount, 10) || 0;
          }

          if (name && url && (originalPrice || salePrice)) {
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

        // Check if there are more pages - look for next page link or load more
        var hasMore = results.length > 0;

        return { products: results, hasMore: hasMore };
      } catch (err) {
        console.error('Fetch error:', err);
        return { products: [], hasMore: false };
      }
    })()
  `) as { products: Array<{ name: string; originalPrice: string; salePrice: string; url: string; imageUrl: string; brand: string | null; discountPercent: number }>; hasMore: boolean };

  // Parse prices and convert to RawProduct
  const products: RawProduct[] = result.products.map(p => {
    const original = parsePrice(p.originalPrice);
    const sale = parsePrice(p.salePrice);
    const discount = p.discountPercent || calcDiscount(original, sale);
    return {
      name: p.name,
      originalPrice: original,
      salePrice: sale,
      url: p.url,
      imageUrl: p.imageUrl,
      brand: p.brand,
      discountPercent: discount,
    };
  });

  return { products, hasMore: result.hasMore };
}

async function scrapeSportVision(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting SportVision scraper with POST pagination...");
  console.log(`Scraping outlet: ${OUTLET_URL}/page-N`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // First visit the main page to establish cookies/session
    console.log("Loading main page to establish session...");
    try {
      await page.goto(OUTLET_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await sleep(2000);
    } catch (err) {
      console.log("Initial page load timed out, trying pagination anyway...");
    }

    // Paginate through all pages
    let currentPage = 1;
    let consecutiveEmpty = 0;

    while (currentPage <= MAX_PAGES && consecutiveEmpty < 3) {
      console.log(`\n=== Page ${currentPage} ===`);

      try {
        const { products, hasMore } = await fetchPageProducts(page, currentPage);
        console.log(`Found ${products.length} products`);

        if (products.length === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 3) {
            console.log("No more products after 3 empty pages, stopping");
            break;
          }
        } else {
          consecutiveEmpty = 0;
        }

        if (currentPage === 1 && products.length > 0) {
          console.log("Sample product:", JSON.stringify(products[0], null, 2));
        }

        for (const product of products) {
          if (seenUrls.has(product.url)) continue;
          seenUrls.add(product.url);

          totalScraped++;

          if (product.salePrice <= 0 || product.originalPrice <= 0) continue;
          if (product.salePrice >= product.originalPrice) continue;

          if (product.discountPercent >= MIN_DISCOUNT) {
            await upsertDeal({
              id: generateId(product.url),
              store: STORE,
              name: product.name,
              brand: product.brand,
              originalPrice: product.originalPrice,
              salePrice: product.salePrice,
              discountPercent: product.discountPercent,
              url: product.url,
              imageUrl: product.imageUrl,
              gender: "unisex",
            });
            totalDeals++;
          }
        }

        console.log(`Running total: ${totalDeals} deals (${totalScraped} scraped)`);

        if (!hasMore) {
          console.log("No more products indicated");
          break;
        }

        currentPage++;
        await sleep(500 + Math.random() * 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`page ${currentPage}: ${message}`);
        console.error(`Error on page ${currentPage}:`, message);
        consecutiveEmpty++;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    console.error("Error:", message);
  } finally {
    await browser.close();
  }

  await logScrapeRun(STORE, totalScraped, totalDeals, errors);
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
if (process.argv[1]?.includes('sportvision.ts') && !process.argv[1]?.includes('details')) {
  scrapeSportVision().catch(console.error);
}

export { scrapeSportVision };
