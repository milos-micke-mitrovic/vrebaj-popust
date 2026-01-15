import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { RawDeal, Store, ScrapeResult } from "../types/deal";
import * as fs from "fs";
import * as path from "path";

puppeteer.use(StealthPlugin());

const DATA_DIR = path.join(process.cwd(), "data");

interface ProductDetails {
  sizes: string[];
  description: string | null;
  detailImageUrl: string | null;
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

// Store-specific extraction functions
async function extractDjakSportDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(() => {
    const sizes: string[] = [];
    // Target only size swatches, not color swatches
    const sizeElements = document.querySelectorAll(".swatch-attribute.size .swatch-option.text");
    sizeElements.forEach((el) => {
      const size = el.getAttribute("data-option-label") || el.textContent?.trim();
      if (size && size.length <= 5 && /^[A-Za-z0-9.\/]+$/.test(size)) {
        if (!sizes.includes(size)) sizes.push(size);
      }
    });

    let description: string | null = null;
    const descEl = document.querySelector(".product.attribute.description .value, .product-description");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(".gallery-placeholder img, .product.media img");
    if (imgEl) {
      detailImageUrl = (imgEl as HTMLImageElement).src || null;
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractPlanetaDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(() => {
    const sizes: string[] = [];
    // Planeta uses swatch-option with data-option-label for sizes
    const sizeElements = document.querySelectorAll(".swatch-attribute.size .swatch-option.text");
    sizeElements.forEach((el) => {
      const size = el.getAttribute("data-option-label") || el.textContent?.trim();
      if (size && size.length <= 5 && /^[A-Za-z0-9.\/]+$/.test(size)) {
        sizes.push(size);
      }
    });

    let description: string | null = null;
    const descEl = document.querySelector(".product.attribute.description .value");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(".gallery-placeholder img, .product.media img");
    if (imgEl) {
      detailImageUrl = (imgEl as HTMLImageElement).src || null;
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractSportVisionDetails(page: Page): Promise<ProductDetails> {
  // Wait for size selector to load
  await page.waitForSelector("ul.product-attributes li", { timeout: 8000 }).catch(() => {});

  return page.evaluate(() => {
    const sizes: string[] = [];

    // Sport Vision: get sizes that are in stock (not .disabled) and visible
    // Use original-size (plain "Veličine") instead of eur-size to get S/M/L/XL instead of ages like "9-10g."
    const sizeElements = document.querySelectorAll("ul.product-attributes li:not(.disabled)");
    sizeElements.forEach((el) => {
      // Skip hidden elements
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.display === "none") return;

      // Try original-size first (plain sizes like S, M, L, XL or numeric like 39, 40, 41)
      const sizeSpan = el.querySelector("span.original-size");
      const size = sizeSpan?.textContent?.trim();
      if (size && !sizes.includes(size)) {
        sizes.push(size);
      }
    });

    let description: string | null = null;
    const descEl = document.querySelector(".product-description, .description");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(".product-gallery img, .main-image img, .swiper-slide img, img[src*='product']");
    if (imgEl) {
      detailImageUrl = (imgEl as HTMLImageElement).src || null;
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractNSportDetails(page: Page): Promise<ProductDetails> {
  // Wait for size selector to load
  await page.waitForSelector("ul.size-list li", { timeout: 8000 }).catch(() => {});

  return page.evaluate(() => {
    const sizes: string[] = [];

    // N-Sport uses ul.size-list li with input[data-size] attribute
    const sizeInputs = document.querySelectorAll("ul.size-list li input[data-size]");
    sizeInputs.forEach((el) => {
      const size = el.getAttribute("data-size");
      if (size && !sizes.includes(size)) {
        sizes.push(size);
      }
    });

    let description: string | null = null;
    const descEl = document.querySelector(".product-description, .description");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(".product-image img, .main-image img, .gallery img");
    if (imgEl) {
      detailImageUrl = (imgEl as HTMLImageElement).src || null;
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractBuzzDetails(page: Page): Promise<ProductDetails> {
  // Wait for size selector to load
  await page.waitForSelector("ul.product-attributes li, [class*='size'], .sizes", { timeout: 5000 }).catch(() => {});

  return page.evaluate(() => {
    const sizes: string[] = [];
    const validClothingSizes = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];

    // Buzz uses ul.product-attributes li with data-productsize-name attribute
    // Skip disabled items (out of stock)
    const sizeElements = document.querySelectorAll("ul.product-attributes li:not(.disabled)");
    sizeElements.forEach((el) => {
      // Get size from data attribute or text content
      const size = el.getAttribute("data-productsize-name") || el.textContent?.trim();
      if (size && size.length <= 8) {
        // Accept shoe sizes (35-50) or clothing sizes (S, M, L, etc.)
        const numericPart = parseFloat(size.split(" ")[0]);
        const isShoeSize = !isNaN(numericPart) && numericPart >= 35 && numericPart <= 50;
        const isClothingSize = validClothingSizes.includes(size.toUpperCase());
        if ((isShoeSize || isClothingSize) && !sizes.includes(size)) {
          sizes.push(size);
        }
      }
    });

    // Fallback: try select dropdown if no sizes found
    if (sizes.length === 0) {
      const selectOptions = document.querySelectorAll("select option");
      selectOptions.forEach((opt) => {
        const size = opt.textContent?.trim();
        if (size && size.length <= 8) {
          const numericPart = parseFloat(size.split(" ")[0]);
          const isShoeSize = !isNaN(numericPart) && numericPart >= 35 && numericPart <= 50;
          const isClothingSize = validClothingSizes.includes(size.toUpperCase());
          if ((isShoeSize || isClothingSize) && !sizes.includes(size)) {
            sizes.push(size);
          }
        }
      });
    }

    let description: string | null = null;
    const descEl = document.querySelector(".product-description, .description-text");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(".product-gallery img, .product-image img, .swiper-slide img, img[src*='product']");
    if (imgEl) {
      detailImageUrl = (imgEl as HTMLImageElement).src || null;
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractOfficeShoesDetails(page: Page): Promise<ProductDetails> {
  // Wait for size selector to load - officeshoes uses ul.sizes
  await page.waitForSelector("ul.sizes li", { timeout: 8000 }).catch(() => {});

  return page.evaluate(() => {
    const sizes: string[] = [];

    // Office Shoes uses ul.sizes li with data-product-size attribute containing actual size
    const sizeElements = document.querySelectorAll("ul.sizes li[data-product-size]");
    sizeElements.forEach((el) => {
      const size = el.getAttribute("data-product-size");
      if (size && !sizes.includes(size)) {
        sizes.push(size);
      }
    });

    // Get brand description from "O brendu" section
    let description: string | null = null;
    const descEl = document.querySelector(".content-about .brandinfo-text p");
    if (descEl) {
      description = descEl.textContent?.trim() || null;
    }

    // Get main product image from aniimated-thumbnials or CDN
    let detailImageUrl: string | null = null;
    const imgEl = document.querySelector(
      ".aniimated-thumbnials img, img[src*='cdn.officeshoes'], img[src*='big/'], .gallery img"
    );
    if (imgEl) {
      const src = (imgEl as HTMLImageElement).src;
      // Only use product images, not logos
      if (src && !src.includes("brandlogo")) {
        detailImageUrl = src;
      }
    }

    return { sizes, description, detailImageUrl };
  });
}

// Generic fallback extraction
async function extractGenericDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(() => {
    const sizes: string[] = [];
    // Try common size selectors
    const sizeSelectors = [
      ".size-selector button",
      ".sizes button",
      ".size-list .size",
      "[data-size]",
      ".swatch-option.text",
      "[class*='size'] button",
      "[class*='size'] span",
    ];

    for (const selector of sizeSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el) => {
          const size = el.textContent?.trim() || el.getAttribute("data-size");
          if (size && size.length < 10 && !sizes.includes(size)) {
            sizes.push(size);
          }
        });
        if (sizes.length > 0) break;
      }
    }

    let description: string | null = null;
    const descSelectors = [
      ".product-description",
      ".description",
      "[class*='description'] p",
      ".product-info .value",
    ];
    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        description = el.textContent.trim();
        break;
      }
    }

    let detailImageUrl: string | null = null;
    const imgSelectors = [
      ".product-gallery img",
      ".gallery-placeholder img",
      ".main-image img",
      ".product-image img",
    ];
    for (const selector of imgSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        detailImageUrl = (el as HTMLImageElement).src || null;
        break;
      }
    }

    return { sizes, description, detailImageUrl };
  });
}

async function extractDetails(page: Page, store: Store): Promise<ProductDetails> {
  switch (store) {
    case "djaksport":
      return extractDjakSportDetails(page);
    case "planeta":
      return extractPlanetaDetails(page);
    case "sportvision":
      return extractSportVisionDetails(page);
    case "nsport":
      return extractNSportDetails(page);
    case "buzz":
      return extractBuzzDetails(page);
    case "officeshoes":
      return extractOfficeShoesDetails(page);
    default:
      return extractGenericDetails(page);
  }
}

async function scrapeProductDetails(
  browser: Browser,
  deal: RawDeal,
  store: Store
): Promise<ProductDetails | null> {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`  Visiting: ${deal.url}`);

    await page.goto(deal.url, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    // Wait for dynamic content to load
    await sleep(3000 + Math.random() * 1000);

    const details = await extractDetails(page, store);

    console.log(`  Found ${details.sizes.length} sizes`);

    return details;
  } catch (error) {
    console.error(`  Error scraping ${deal.url}:`, error instanceof Error ? error.message : error);
    return null;
  } finally {
    await page.close();
  }
}

async function scrapeStoreDetails(store: Store, force = false): Promise<void> {
  const filePath = path.join(DATA_DIR, `${store}-deals.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`No data file found for ${store}, skipping...`);
    return;
  }

  console.log(`\n=== Processing ${store} ===`);

  const data: ScrapeResult = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const deals = data.deals;

  console.log(`Found ${deals.length} deals to process`);

  if (deals.length === 0) {
    return;
  }

  const browser = await launchBrowser();
  let processed = 0;
  let enriched = 0;

  try {
    for (const deal of deals) {
      // Skip if already has details with sizes (unless force mode)
      // Re-scrape products that failed (have detailsScrapedAt but no sizes)
      if (deal.detailsScrapedAt && deal.sizes && deal.sizes.length > 0 && !force) {
        console.log(`  Skipping ${deal.id} - already scraped`);
        processed++;
        continue;
      }

      const details = await scrapeProductDetails(browser, deal, store);

      if (details) {
        deal.sizes = details.sizes;
        deal.description = details.description;
        deal.detailImageUrl = details.detailImageUrl;
        deal.detailsScrapedAt = new Date();
        enriched++;
      }

      processed++;
      console.log(`  Progress: ${processed}/${deals.length} (enriched: ${enriched})`);

      // Random delay between requests
      await sleep(1500 + Math.random() * 1500);

      // Save progress every 10 products
      if (processed % 10 === 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`  Saved progress...`);
      }
    }
  } finally {
    await browser.close();
  }

  // Final save
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`\nCompleted ${store}: ${enriched}/${deals.length} deals enriched`);
}

async function scrapeAllDetails(force = false): Promise<void> {
  console.log("Starting detail scraper...");
  console.log(`Data directory: ${DATA_DIR}`);

  const stores: Store[] = ["djaksport", "planeta", "sportvision", "nsport", "buzz", "officeshoes"];

  for (const store of stores) {
    try {
      await scrapeStoreDetails(store, force);
    } catch (error) {
      console.error(`Error processing ${store}:`, error);
    }
  }

  console.log("\n=== Detail scraping complete ===");
}

// Allow running for specific store with optional --force flag
const args = process.argv.slice(2);
const forceRescrape = args.includes("--force");
const storeArg = args.find((arg) => !arg.startsWith("--")) as Store | undefined;

if (forceRescrape) {
  console.log("Force mode: will re-scrape all products");
}

async function runScraper() {
  if (storeArg && ["djaksport", "planeta", "sportvision", "nsport", "buzz", "officeshoes"].includes(storeArg)) {
    await scrapeStoreDetails(storeArg, forceRescrape);
  } else {
    await scrapeAllDetails(forceRescrape);
  }
  console.log("Done!");
}

runScraper().catch(console.error);

export { scrapeStoreDetails, scrapeAllDetails };
