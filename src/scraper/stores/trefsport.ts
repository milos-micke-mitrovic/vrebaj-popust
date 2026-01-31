import { JSDOM } from "jsdom";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store } from "../db-writer";

const STORE: Store = "trefsport";
const BASE_URL = "https://trefsport.com";
const OUTLET_URL = `${BASE_URL}/Outlet`;
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
  // Format: "RSD 47,000.00*" or "RSD\u00a047,000.00*"
  const cleaned = priceStr
    .replace(/RSD|din|€|\*|\s|&nbsp;/gi, "")
    .trim()
    .replace(/,/g, ""); // "47000.00"
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

  const cards = doc.querySelectorAll(".card.product-box");

  cards.forEach((card: Element) => {
    // Get product link and name
    const nameLink = card.querySelector("a.product-name") as HTMLAnchorElement | null;
    let url = nameLink?.getAttribute("href") || "";
    if (url && !url.startsWith("http")) {
      url = BASE_URL + (url.startsWith("/") ? "" : "/") + url;
    }
    const name = nameLink?.textContent?.trim() || "";

    // Get image
    const imgEl = card.querySelector("img.product-image") as HTMLImageElement | null;
    const imageUrl = imgEl?.getAttribute("src") || "";

    // Get sale price - the main price text
    const priceEl = card.querySelector(".product-price.with-list-price");
    let salePrice = "";
    if (priceEl) {
      // Get the text content before the list-price span
      const fullText = priceEl.textContent || "";
      // The sale price is the first "RSD X,XXX.XX*" in the element
      const match = fullText.match(/RSD[\s\u00a0]*[\d,]+\.\d+\*/);
      if (match) {
        salePrice = match[0];
      }
    }

    // Fallback: try .product-price without .with-list-price
    if (!salePrice) {
      const simplePriceEl = card.querySelector(".product-price");
      if (simplePriceEl) {
        const match = simplePriceEl.textContent?.match(/RSD[\s\u00a0]*[\d,]+\.\d+\*/);
        if (match) {
          salePrice = match[0];
        }
      }
    }

    // Get original price
    const listPriceEl = card.querySelector(".list-price-price");
    const originalPrice = listPriceEl?.textContent?.trim() || "";

    // Get discount from badge
    const discountBadge = card.querySelector(".badge-discount span");
    let discountFromSite: number | null = null;
    if (discountBadge) {
      const match = discountBadge.textContent?.match(/(\d+)/);
      if (match) discountFromSite = parseInt(match[1], 10);
    }

    // Get brand from manufacturer badge
    const brandBadge = card.querySelector(".badge-manufacturer span");
    const brand = brandBadge?.textContent?.trim() || null;

    if (name && url && (originalPrice || salePrice)) {
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

function hasNextPage(html: string): boolean {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  // Shopware pagination: look for next page link
  const nextLink = doc.querySelector('.pagination .page-next:not(.disabled), .pagination-nav .page-next:not(.disabled), a[rel="next"]');
  return !!nextLink;
}

async function scrapeTrefSport(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting Tref Sport scraper (fetch + JSDOM)...");
  console.log(`URL: ${OUTLET_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  let currentPage = 1;
  const maxPages = 50;

  while (currentPage <= maxPages) {
    const pageUrl = currentPage === 1 ? OUTLET_URL : `${OUTLET_URL}?p=${currentPage}`;
    console.log(`\nPage ${currentPage}: ${pageUrl}`);

    try {
      const html = await fetchPage(pageUrl);
      const products = extractProducts(html);
      console.log(`Found ${products.length} products`);

      if (products.length === 0) {
        console.log("No products found, ending pagination");
        break;
      }

      if (currentPage === 1 && products.length > 0) {
        console.log("Sample product:", JSON.stringify(products[0], null, 2));
      }

      for (const product of products) {
        if (seenUrls.has(product.url)) continue;
        seenUrls.add(product.url);

        const originalPrice = parsePrice(product.originalPrice);
        const salePrice = parsePrice(product.salePrice);

        if (originalPrice <= 0 || salePrice <= 0) continue;
        if (salePrice >= originalPrice) continue;

        const discountPercent = product.discountFromSite || calcDiscount(originalPrice, salePrice);

        if (discountPercent < MIN_DISCOUNT) continue;

        if (totalDeals < 5) {
          console.log(`Saving: ${product.name.substring(0, 40)}... | ${discountPercent}% | brand=${product.brand}`);
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
          });
          totalDeals++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!message.includes("Unique constraint")) {
            console.error(`Error saving ${product.name}:`, message);
          }
        }
      }

      totalScraped += products.length;
      console.log(`Deals with ${MIN_DISCOUNT}%+ discount: ${totalDeals} (total scraped: ${totalScraped})`);

      // Check if there's a next page
      if (!hasNextPage(html)) {
        console.log("No next page found, ending pagination");
        break;
      }

      currentPage++;
      await sleep(1000 + Math.random() * 500);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Page ${currentPage}: ${message}`);
      console.error(`Error on page ${currentPage}:`, message);
      break;
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
if (process.argv[1]?.includes("trefsport.ts")) {
  scrapeTrefSport().catch(console.error);
}

export { scrapeTrefSport };
