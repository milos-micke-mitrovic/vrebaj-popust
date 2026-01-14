import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, ScrapeResult } from "../../types/deal";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

puppeteer.use(StealthPlugin());

const STORE = "sportvision" as const;
const BASE_URL = "https://www.sportvision.rs";
const SALE_PAGES = [
  { url: `${BASE_URL}/proizvodi/samo-online-muskarci`, gender: "men" },
  { url: `${BASE_URL}/proizvodi/samo-online-zene`, gender: "women" },
  { url: `${BASE_URL}/proizvodi/samo-online-deca`, gender: "kids" },
];
const MIN_DISCOUNT = 50;
const IMAGE_DIR = path.join(process.cwd(), "public", "images", "sportvision");

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
    return `/images/sportvision/${normalizedFilename}`;
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
        return `/images/sportvision/${normalizedFilename}`;
      }
    } catch {
      // Fall through to https download
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
            Referer: "https://www.sportvision.rs/",
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
            resolve(`/images/sportvision/${normalizedFilename}`);
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

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(`
    (function() {
      return new Promise(function(resolve) {
        var totalHeight = 0;
        var distance = 500;
        var maxScrolls = 50;
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

async function clickShowMore(page: Page): Promise<boolean> {
  try {
    const showMoreButton = await page.$('button:has-text("Prikaži više"), .show-more, [class*="load-more"]');
    if (showMoreButton) {
      await showMoreButton.click();
      await sleep(2000);
      return true;
    }
  } catch {
    // No more button or error
  }
  return false;
}

async function scrapeSportVision(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allDeals: RawDeal[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;

  console.log("Starting SportVision scraper with stealth mode...");
  console.log(`Scraping ${SALE_PAGES.length} gender sections`);
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

        // Save debug screenshot for first section only
        if (salePage === SALE_PAGES[0]) {
          await page.screenshot({
            path: path.join(process.cwd(), "data", "sportvision-page-1.png"),
          });
          const html = await page.content();
          fs.writeFileSync(
            path.join(process.cwd(), "data", "sportvision-page-1.html"),
            html
          );
          console.log("Saved debug screenshot and HTML");
        }

        // Click "Load more" button until all products are loaded
        let loadMoreClicks = 0;
        const maxClicks = 50; // Safety limit

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
            await loadMoreBtn.click();
            loadMoreClicks++;
            console.log(`Clicked 'Load more' (${loadMoreClicks}), waiting for products...`);
            await sleep(2000 + Math.random() * 1000);

            const productCountAfter = await page.evaluate(() =>
              document.querySelectorAll('.product-item[data-productid]').length
            );

            if (productCountAfter === productCountBefore) {
              console.log("No new products loaded, stopping");
              break;
            }

            console.log(`Products: ${productCountBefore} -> ${productCountAfter}`);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.log(`Error clicking load more: ${message}`);
            break;
          }
        }

        // Now extract all products
        const products = await extractProducts(page);
        console.log(`Found ${products.length} total product elements`);

        if (products.length > 0 && salePage === SALE_PAGES[0]) {
          console.log("Sample product:", JSON.stringify(products[0], null, 2));
        }

        // Gender marker for extractGender() to detect
        const genderMarker = salePage.gender === "men" ? " men"
          : salePage.gender === "women" ? " women"
          : " kids";

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
          }
        }

        console.log(
          `Deals with ${MIN_DISCOUNT}%+ discount: ${allDeals.length} (total scraped: ${totalScraped})`
        );

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${salePage.gender}: ${message}`);
        console.error(`Error scraping ${salePage.gender}:`, message);
      }

      await sleep(3000 + Math.random() * 2000);
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
scrapeSportVision()
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

export { scrapeSportVision };
