import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, ScrapeResult } from "../../types/deal";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const IMAGE_DIR = path.join(process.cwd(), "public", "images", "djaksport");

const STORE = "djaksport" as const;
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

async function downloadImage(url: string, filename: string, page?: Page): Promise<string | null> {
  const normalizedFilename = filename.toLowerCase();
  const filePath = path.join(IMAGE_DIR, normalizedFilename);

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    return `/images/djaksport/${normalizedFilename}`;
  }

  // Try fetching via page context (has cookies/session)
  if (page) {
    try {
      const base64 = await page.evaluate(async (imgUrl: string) => {
        const response = await fetch(imgUrl);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }, url);

      if (base64 && typeof base64 === "string") {
        const data = base64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(data, "base64"));
        return `/images/djaksport/${normalizedFilename}`;
      }
    } catch {
      // Fall through to https method
    }
  }

  // Fallback to direct https download
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://www.djaksport.com/",
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        resolve(null);
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(`/images/djaksport/${normalizedFilename}`);
      });
    }).on("error", () => {
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      resolve(null);
    });
  });
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

async function scrapeDjakSport(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allDeals: RawDeal[] = [];
  let totalScraped = 0;

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
          const originalPrice = parsePrice(product.originalPrice);
          const salePrice = parsePrice(product.salePrice);

          if (originalPrice <= 0 || salePrice <= 0) continue;
          if (salePrice >= originalPrice) continue;

          const discountPercent =
            product.discountFromSite || calcDiscount(originalPrice, salePrice);

          if (discountPercent >= MIN_DISCOUNT) {
            // Download image locally (pass page for browser context)
            let localImageUrl: string | null = null;
            if (product.imageUrl) {
              const imgFilename = product.imageUrl.split("/").pop() || `${idCounter}.jpg`;
              localImageUrl = await downloadImage(product.imageUrl, imgFilename, page);
            }

            allDeals.push({
              id: generateId(product.url),
              store: STORE,
              name: product.name,
              brand: product.brand,
              originalPrice,
              salePrice,
              discountPercent,
              url: product.url,
              imageUrl: localImageUrl || product.imageUrl,
              category: null,
              scrapedAt: new Date(),
            });
          }
        }

        totalScraped += products.length;
        console.log(
          `Deals with ${MIN_DISCOUNT}%+ discount: ${allDeals.length} (total scraped: ${totalScraped})`
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

  const result: ScrapeResult = {
    store: STORE,
    deals: allDeals,
    totalScraped,
    filteredCount: allDeals.length,
    scrapedAt: new Date(),
    errors,
  };

  const outputPath = path.join(process.cwd(), "data", `${STORE}-deals.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
  console.log(`Total products scraped: ${totalScraped}`);
  console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${allDeals.length}`);

  return result;
}

// Run
scrapeDjakSport()
  .then((result) => {
    console.log("\n=== Scraping Complete ===");
    console.log(`Store: ${result.store}`);
    console.log(`Total products scraped: ${result.totalScraped}`);
    console.log(`Deals with 50%+ discount: ${result.filteredCount}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`);
    }
  })
  .catch(console.error);

export { scrapeDjakSport };
