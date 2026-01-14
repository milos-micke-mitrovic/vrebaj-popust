import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, ScrapeResult } from "../../types/deal";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

puppeteer.use(StealthPlugin());

const STORE = "nsport" as const;
const BASE_URL = "https://www.n-sport.net";
const SALE_PAGES = [
  {
    url: `${BASE_URL}/promos/popusti-od-40-do-70-sport.html`,
    paginationBase: `${BASE_URL}/index.php?mod=catalog&op=browse&view=promo&sef_name=popusti-od-40-do-70-sport&filters%5Bpromo%5D%5B0%5D=Popusti+od+40%25+do+70%25+Sport`,
  },
  {
    url: `${BASE_URL}/promos/popusti-do--60.html`,
    paginationBase: `${BASE_URL}/index.php?mod=catalog&op=browse&view=promo&sef_name=popusti-do--60&filters%5Bpromo%5D%5B0%5D=Popusti+do+-60%25`,
  },
];
const MIN_DISCOUNT = 50;
const IMAGE_DIR = path.join(process.cwd(), "public", "images", "nsport");

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
    return `/images/nsport/${normalizedFilename}`;
  }

  // Ensure URL is absolute
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
        return `/images/nsport/${normalizedFilename}`;
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
            Referer: "https://www.n-sport.net/",
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
            resolve(`/images/nsport/${normalizedFilename}`);
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

async function scrapeNSport(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const allDeals: RawDeal[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;

  console.log("Starting N-Sport scraper with stealth mode...");
  console.log(`Scraping ${SALE_PAGES.length} promo sections`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const promoSection of SALE_PAGES) {
      console.log(`\n=== Scraping: ${promoSection.url} ===`);

      let currentPage = 1;
      const maxPages = 10;

      while (currentPage <= maxPages) {
        const pageUrl = currentPage === 1
          ? promoSection.url
          : `${promoSection.paginationBase}&pg=${currentPage}`;
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

        // Save debug screenshot for first page of first section only
        if (currentPage === 1 && promoSection === SALE_PAGES[0]) {
          await page.screenshot({
            path: path.join(process.cwd(), "data", "nsport-page-1.png"),
          });
          const html = await page.content();
          fs.writeFileSync(
            path.join(process.cwd(), "data", "nsport-page-1.html"),
            html
          );
          console.log("Saved debug screenshot and HTML");
        }

        const products = await extractProducts(page);
        console.log(`Found ${products.length} product elements`);

        if (products.length === 0) {
          console.log("No products found, ending pagination");
          break;
        }

        if (products.length > 0 && currentPage === 1 && promoSection === SALE_PAGES[0]) {
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

        // Check if there's a next page - N-Sport uses .paginationTG with >> for next
        const hasNextPage = await page.evaluate(`
          (function() {
            var paginationLinks = document.querySelectorAll('.paginationTG a');
            for (var i = 0; i < paginationLinks.length; i++) {
              if (paginationLinks[i].textContent.trim() === '>>' ||
                  paginationLinks[i].textContent.trim() === '»') {
                return true;
              }
            }
            return false;
          })()
        `) as boolean;

        if (!hasNextPage) {
          console.log("No more pages");
          break;
        }

        currentPage++;
        await sleep(3000 + Math.random() * 2000);

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Page ${currentPage}: ${message}`);
        console.error(`Error on page ${currentPage}:`, message);
        break;
      }
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
scrapeNSport()
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

export { scrapeNSport };
