import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, ScrapeResult } from "../../types/deal";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

puppeteer.use(StealthPlugin());

const STORE = "planeta" as const;
const BASE_URL = "https://planetasport.rs";
const SNIZENO_URL = `${BASE_URL}/snizeno`;
const MIN_DISCOUNT = 50;
const IMAGE_DIR = path.join(process.cwd(), "public", "images", "planeta");

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

async function downloadImage(
  url: string,
  filename: string,
  page?: Page
): Promise<string | null> {
  const normalizedFilename = filename.toLowerCase();
  const filePath = path.join(IMAGE_DIR, normalizedFilename);

  if (fs.existsSync(filePath)) {
    return `/images/planeta/${normalizedFilename}`;
  }

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
        return `/images/planeta/${normalizedFilename}`;
      }
    } catch {
      // Fall through
    }
  }

  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Referer: "https://planetasport.rs/",
          },
        },
        (response) => {
          if (response.statusCode !== 200) {
            file.close();
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            resolve(null);
            return;
          }
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(`/images/planeta/${normalizedFilename}`);
          });
        }
      )
      .on("error", () => {
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
      // Planeta Sport uses .product-item-info containers
      var items = document.querySelectorAll('.product-item-info');

      items.forEach(function(el) {
        // Get product link (either from a.product-img or .product-item-name a)
        var linkEl = el.querySelector('a.product-img') || el.querySelector('.product-item-name a');
        var url = linkEl ? linkEl.href : '';

        // Get product name
        var nameEl = el.querySelector('.product-item-name a');
        var name = nameEl ? nameEl.textContent.trim() : '';

        // Get image
        var imgEl = el.querySelector('img.product-image-photo');
        var imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';

        // Get original price - look for old-price first, then regular-price
        var oldPriceEl = el.querySelector('.normal-price.old-price .price');
        var regularPriceEl = el.querySelector('.normal-price.regular-price .price');
        var originalPrice = '';

        // If there's a special price, the original is either old-price or regular-price
        var specialPriceEl = el.querySelector('.normal-price.special-price .price, .zsdev-special-price .price');
        if (specialPriceEl) {
          // Use old-price if available, otherwise regular-price
          originalPrice = oldPriceEl ? oldPriceEl.textContent.trim() :
                         (regularPriceEl ? regularPriceEl.textContent.trim() : '');
        }

        // Get sale price (special price)
        var salePrice = specialPriceEl ? specialPriceEl.textContent.trim() : '';

        // Get discount from site badge (action-box contains "-43%" etc)
        var discountEl = el.querySelector('.action-box.action-box-1');
        var discountFromSite = null;
        if (discountEl) {
          var match = discountEl.textContent.match(/(\\d+)/);
          if (match) discountFromSite = parseInt(match[1], 10);
        }

        // Get brand
        var brand = null;
        var brandEl = el.querySelector('.product-brand a');
        if (brandEl) {
          brand = brandEl.textContent.trim();
        }

        // Planeta uses .html URLs
        if (name && url && url.includes('.html')) {
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

async function scrapePlaneta(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allDeals: RawDeal[] = [];
  let totalScraped = 0;

  console.log("Starting Planeta Sport scraper with stealth mode...");
  console.log(`Target: ${SNIZENO_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let currentUrl: string | null = SNIZENO_URL;
    let pageNum = 1;
    const maxPages = 10;

    while (currentUrl && pageNum <= maxPages) {
      console.log(`\nScraping page ${pageNum}: ${currentUrl}`);

      try {
        await page.goto(currentUrl, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        // Wait for product grid to load
        try {
          await page.waitForSelector(".product-item-info", { timeout: 15000 });
          console.log("Product grid loaded");
        } catch {
          console.log("Waiting for product grid timed out, continuing...");
        }

        await sleep(3000 + Math.random() * 2000);
        await autoScroll(page);
        await sleep(2000);

        // Check for block
        const isBlocked = await page.evaluate(`
          document.body.innerText.includes('blocked') ||
          document.body.innerText.includes('Cloudflare') ||
          document.title.includes('Just a moment')
        `);

        if (isBlocked) {
          console.log("Detected block, saving screenshot...");
          await page.screenshot({
            path: path.join(process.cwd(), "data", `planeta-blocked-${pageNum}.png`),
          });
          break;
        }

        // Save debug screenshot for first page
        if (pageNum === 1) {
          await page.screenshot({
            path: path.join(process.cwd(), "data", "planeta-page-1.png"),
          });
          const html = await page.content();
          fs.writeFileSync(
            path.join(process.cwd(), "data", "planeta-page-1.html"),
            html
          );
          console.log("Saved debug screenshot and HTML");
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
            let localImageUrl: string | null = null;
            if (product.imageUrl) {
              const imgFilename =
                product.imageUrl.split("/").pop() || `${idCounter}.jpg`;
              localImageUrl = await downloadImage(
                product.imageUrl,
                imgFilename,
                page
              );
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

        // Try to find next page
        const nextPageUrl = await page.evaluate(`
          (function() {
            var nextLink = document.querySelector('a.next, a[rel="next"], .pagination .next a');
            if (nextLink && nextLink.href) return nextLink.href;
            // Try page parameter
            var currentUrl = window.location.href;
            var pageMatch = currentUrl.match(/[?&]page=(\\d+)/);
            var currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
            if (currentUrl.includes('?')) {
              return currentUrl.replace(/([?&])page=\\d+/, '$1page=' + (currentPage + 1));
            }
            return currentUrl + '?page=' + (currentPage + 1);
          })()
        `) as string | null;

        currentUrl = nextPageUrl;
        pageNum++;

        if (currentUrl && pageNum <= maxPages) {
          await sleep(3000 + Math.random() * 2000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Page ${pageNum}: ${message}`);
        console.error(`Error on page ${pageNum}:`, message);
        break;
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
scrapePlaneta()
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

export { scrapePlaneta };
