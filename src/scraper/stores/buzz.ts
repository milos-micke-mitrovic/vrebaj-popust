import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, ScrapeResult } from "../../types/deal";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

puppeteer.use(StealthPlugin());

const STORE = "buzz" as const;
const BASE_URL = "https://www.buzzsneakers.rs";
const SALE_PAGES = [
  { url: `${BASE_URL}/proizvodi/buzz-sale-men`, gender: "men" },
  { url: `${BASE_URL}/proizvodi/buzz-sale-women`, gender: "women" },
  { url: `${BASE_URL}/proizvodi/buzz-sale-kids`, gender: "kids" },
];
const MIN_DISCOUNT = 50;
const IMAGE_DIR = path.join(process.cwd(), "public", "images", "buzz");

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

// Ensure image directory exists
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function downloadImage(
  url: string,
  filename: string,
  page?: Page
): Promise<string | null> {
  const normalizedFilename = filename.toLowerCase().replace(/\.webp$/, ".jpg");
  const filePath = path.join(IMAGE_DIR, normalizedFilename);

  if (fs.existsSync(filePath)) {
    return `/images/buzz/${normalizedFilename}`;
  }

  let fullUrl = url;
  if (url.startsWith("//")) {
    fullUrl = "https:" + url;
  } else if (url.startsWith("/")) {
    fullUrl = BASE_URL + url;
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
      }, fullUrl);

      if (base64 && typeof base64 === "string") {
        const data = base64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(data, "base64"));
        return `/images/buzz/${normalizedFilename}`;
      }
    } catch {
      // Fall through to https download
    }
  }

  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(
        fullUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Referer: BASE_URL,
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
            resolve(`/images/buzz/${normalizedFilename}`);
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
      var items = document.querySelectorAll('.product-item[data-productid]');

      items.forEach(function(el) {
        // Get data from data attributes - Buzz stores all info there
        var name = el.dataset.productname || '';
        var brand = el.dataset.productbrand || null;
        var salePrice = el.dataset.productprice || '';
        var originalPrice = el.dataset.productprevprice || '';
        var discountPercent = el.dataset.productdiscount ? parseInt(el.dataset.productdiscount, 10) : null;

        // Get product link
        var linkEl = el.querySelector('a[href*="/patike/"], a[href*="/odeca/"], a[href*="/obu"]');
        if (!linkEl) {
          linkEl = el.querySelector('.img-wrapper a[href]');
        }
        var url = linkEl ? linkEl.href : '';

        // Get image
        var imgEl = el.querySelector('img');
        var imageUrl = '';
        if (imgEl) {
          imageUrl = imgEl.src || imgEl.dataset.originalImg || '';
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.buzzsneakers.rs' + imageUrl;
          }
        }

        if (name && url) {
          results.push({
            name: name.trim(),
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

async function clickLoadMoreUntilDone(page: Page): Promise<void> {
  const maxClicks = 50; // Safety limit
  let clicks = 0;

  while (clicks < maxClicks) {
    // Click the load more button by finding it via text content
    const clicked = await page.evaluate(() => {
      // Try common selectors first
      const selectors = [
        'a.load-more',
        'button.load-more',
        '.load-more',
        '.show-more',
        '[class*="load-more"]',
        '[class*="show-more"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && (el as HTMLElement).offsetParent !== null) {
          (el as HTMLElement).click();
          return true;
        }
      }

      // Try finding by text content
      const buttons = document.querySelectorAll('a, button, div[onclick], span[onclick]');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase().trim() || '';
        if (
          text.includes('prikaži više') ||
          text.includes('prikazi vise') ||
          text.includes('load more') ||
          text.includes('učitaj još') ||
          text.includes('ucitaj jos') ||
          text === 'više' ||
          text === 'vise'
        ) {
          // Check if visible
          const htmlEl = btn as HTMLElement;
          if (htmlEl.offsetParent !== null) {
            htmlEl.click();
            return true;
          }
        }
      }
      return false;
    });

    if (!clicked) {
      console.log("No more 'Load More' button found or clickable");
      break;
    }

    clicks++;
    console.log(`  Clicked 'Load More' (${clicks})`);

    // Wait for new products to load
    await sleep(2500 + Math.random() * 1500);
    await autoScroll(page);
    await sleep(1000);
  }

  console.log(`Total 'Load More' clicks: ${clicks}`);
}

async function scrapeBuzz(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allDeals: RawDeal[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;

  console.log("Starting Buzz Sneakers scraper with stealth mode...");
  console.log(`Scraping ${SALE_PAGES.length} sale sections`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const salePage of SALE_PAGES) {
      console.log(`\n=== Scraping: ${salePage.url} (${salePage.gender}) ===`);

      try {
        await page.goto(salePage.url, {
          waitUntil: "networkidle2",
          timeout: 90000,
        });

        // Wait for products to load
        try {
          await page.waitForSelector('.product-item, [data-productid]', { timeout: 15000 });
          console.log("Product grid loaded");
        } catch {
          console.log("Waiting for product grid timed out, continuing...");
        }

        await sleep(2000 + Math.random() * 2000);
        await autoScroll(page);
        await sleep(2000);

        // Click "Load More" button repeatedly until all products are loaded
        console.log("Loading all products via 'Load More' button...");
        await clickLoadMoreUntilDone(page);

        // Final scroll to ensure all images are loaded
        await autoScroll(page);
        await sleep(2000);

        // Save debug screenshot for first section only
        if (salePage === SALE_PAGES[0]) {
          await page.screenshot({
            path: path.join(process.cwd(), "data", "buzz-page-1.png"),
          });
          console.log("Saved debug screenshot");
        }

        const products = await extractProducts(page);
        console.log(`Found ${products.length} product elements after loading all`);

        if (products.length === 0) {
          console.log("No products found");
          continue;
        }

        if (products.length > 0 && salePage === SALE_PAGES[0]) {
          console.log("Sample product:", JSON.stringify(products[0], null, 2));
        }

        // Gender marker for extractGender() to detect
        const genderMarker = salePage.gender === "men" ? " men"
          : salePage.gender === "women" ? " women"
          : " kids";

        let sectionDeals = 0;
        for (const product of products) {
          // Skip duplicates
          if (seenUrls.has(product.url)) continue;
          seenUrls.add(product.url);

          const originalPrice = parsePrice(product.originalPrice);
          const salePrice = parsePrice(product.salePrice);

          if (originalPrice <= 0 || salePrice <= 0) continue;
          if (salePrice >= originalPrice) continue;

          const discountPercent =
            product.discountPercent || calcDiscount(originalPrice, salePrice);

          if (discountPercent >= MIN_DISCOUNT) {
            let localImageUrl: string | null = null;
            if (product.imageUrl) {
              const imgFilename =
                product.imageUrl.split("/").pop()?.split("?")[0] || `${idCounter}.jpg`;
              localImageUrl = await downloadImage(
                product.imageUrl,
                imgFilename,
                page
              );
            }

            // Append gender marker to name for extractGender() to detect
            const nameWithGender = product.name + genderMarker;

            allDeals.push({
              id: generateId(product.url),
              store: STORE,
              name: nameWithGender,
              brand: product.brand,
              originalPrice,
              salePrice,
              discountPercent,
              url: product.url,
              imageUrl: localImageUrl || product.imageUrl,
              category: null,
              scrapedAt: new Date(),
            });
            sectionDeals++;
          }
        }

        totalScraped += products.length;
        console.log(
          `Section ${salePage.gender}: ${sectionDeals} deals with ${MIN_DISCOUNT}%+ (total products: ${products.length})`
        );
        console.log(`Running total: ${allDeals.length} deals (${totalScraped} scraped)`);

        // Delay between sections
        await sleep(3000 + Math.random() * 2000);

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${salePage.gender}: ${message}`);
        console.error(`Error scraping ${salePage.gender}:`, message);
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
scrapeBuzz()
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

export { scrapeBuzz };
