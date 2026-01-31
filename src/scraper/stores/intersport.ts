import { JSDOM } from "jsdom";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store, Gender } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";

const STORE: Store = "intersport";
const BASE_URL = "https://www.intersport.rs";

// Pages sorted by discount percentage - we stop when discount drops below 50%
const CATEGORY_PAGES: { url: string; gender: Gender }[] = [
  { url: `${BASE_URL}/zene?sort=saving_percent`, gender: "zenski" },
  { url: `${BASE_URL}/muskarci?sort=saving_percent`, gender: "muski" },
  { url: `${BASE_URL}/deca?sort=saving_percent`, gender: "deciji" },
];

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
  const pathOnly = url
    .replace(/https?:\/\/[^\/]+/, "")
    .replace(/\.html?$/i, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${STORE}-${pathOnly}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "sr-RS,sr;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function extractProducts(html: string): RawProduct[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const products: RawProduct[] = [];

  const items = doc.querySelectorAll('.product[itemprop="itemListElement"]');

  items.forEach((el: Element) => {
    // Get product link
    const linkEl = el.querySelector('a[itemprop="url"]') as HTMLAnchorElement | null;
    let url = linkEl?.getAttribute("href") || "";
    if (url && !url.startsWith("http")) {
      url = BASE_URL + (url.startsWith("/") ? "" : "/") + url;
    }

    // Get product name
    const nameEl = el.querySelector('a[itemprop="name"]');
    const name = nameEl?.textContent?.trim() || "";

    // Get image
    const imgEl = el.querySelector('img[itemprop="image"]') as HTMLImageElement | null;
    let imageUrl = imgEl?.getAttribute("src") || "";
    if (imageUrl.startsWith("//")) {
      imageUrl = "https:" + imageUrl;
    }

    // Get prices
    const oldPriceEl = el.querySelector(".product-old-price");
    const newPriceEl = el.querySelector('span[itemprop="price"]');

    const originalPrice = oldPriceEl?.textContent?.trim() || "";
    const salePrice = newPriceEl?.textContent?.trim() || "";

    // Get discount badge
    const discountEl = el.querySelector(".percent_flake");
    let discountFromSite: number | null = null;
    if (discountEl) {
      const match = discountEl.textContent?.match(/(\d+)/);
      if (match) discountFromSite = parseInt(match[1], 10);
    }

    // Get brand from meta tag
    const brandEl = el.querySelector('meta[itemprop="brand"]') as HTMLMetaElement | null;
    const brand = brandEl?.getAttribute("content") || null;

    if (name && url && originalPrice && salePrice) {
      products.push({
        name,
        originalPrice,
        salePrice,
        url,
        imageUrl,
        brand,
        discountFromSite,
      });
    }
  });

  return products;
}

async function scrapeIntersport(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting Intersport scraper (fetch + JSDOM)...");
  console.log(`Scraping ${CATEGORY_PAGES.length} category pages`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  for (const { url: categoryUrl, gender } of CATEGORY_PAGES) {
    console.log(`\n=== Scraping: ${categoryUrl} (${gender}) ===`);

    let currentPage = 1;
    const maxPages = 50;
    let foundBelowMinDiscount = false;

    while (currentPage <= maxPages && !foundBelowMinDiscount) {
      const separator = categoryUrl.includes("?") ? "&" : "?";
      const pageUrl = currentPage === 1 ? categoryUrl : `${categoryUrl}${separator}pg=${currentPage}`;
      console.log(`\nPage ${currentPage}: ${pageUrl}`);

      try {
        const html = await fetchPage(pageUrl);
        const products = extractProducts(html);
        console.log(`Found ${products.length} products`);

        if (products.length === 0) {
          console.log("No products found, ending pagination");
          break;
        }

        if (products.length > 0 && currentPage === 1) {
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

          const discountPercent = product.discountFromSite || calcDiscount(originalPrice, salePrice);

          // Since sorted by discount, stop when we hit below MIN_DISCOUNT
          if (discountPercent < MIN_DISCOUNT) {
            console.log(`Found product with ${discountPercent}% discount, stopping (below ${MIN_DISCOUNT}%)`);
            foundBelowMinDiscount = true;
            break;
          }

          const cat = mapCategory(product.name + " " + product.url);
          const categories = cat ? [cat] : [];

          if (totalDeals < 5) {
            console.log(`Saving: ${product.name.substring(0, 40)}... | ${discountPercent}% | gender=${gender}`);
          }

          try {
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
              gender,
              categories,
            });
            totalDeals++;
          } catch (err) {
            // Skip duplicates that might exist from other gender categories
            const message = err instanceof Error ? err.message : String(err);
            if (!message.includes("Unique constraint")) {
              console.error(`Error saving ${product.name}:`, message);
            }
          }
        }

        totalScraped += products.length;
        console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals} (total scraped: ${totalScraped})`);

        currentPage++;
        await sleep(1000 + Math.random() * 500); // Be nice to the server

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${categoryUrl} page ${currentPage}: ${message}`);
        console.error(`Error on page ${currentPage}:`, message);
        break;
      }
    }
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
if (process.argv[1]?.includes("intersport.ts")) {
  scrapeIntersport().catch(console.error);
}

export { scrapeIntersport };
