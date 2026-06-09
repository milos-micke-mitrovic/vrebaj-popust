import { createHash } from "crypto";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store, Gender } from "../db-writer";
import { extractBrandFromName } from "../../lib/brand-utils";
import { mapCategory } from "../../lib/category-mapper";

puppeteer.use(StealthPlugin());

const STORE: Store = "djaksport";
const BASE_URL = "https://www.djaksport.com";
// Djak's discount catalogue lives under a ROTATING seasonal campaign slug. As of
// mid-2026 it is /mid-season-sale (~4600 products); earlier it was /najveci-popusti,
// then /muskarci/ds_muskarci-ds_zene?am_on_sale=1 (which Djak shrank to a ~250-item
// stub, collapsing the scrape to near-zero). This slug WILL change again when Djak
// rotates campaigns — the health-check catches it (deal count craters) when it does.
// AJAX pagination (?shopbyAjax=1) is Cloudflare-blocked, so we do a full page.goto
// per ?p=N page, which keeps the cf_clearance cookie intact.
const SALE_URL = `${BASE_URL}/mid-season-sale`;
const MIN_DISCOUNT = 50;
const MAX_PAGES = 150;

interface RawProduct {
  name: string;
  originalPrice: number;
  salePrice: number;
  url: string;
  imageUrl: string;
  brand: string | null;
  discountPercent: number;
  productId: string;
  sizes: string[];
}

interface FetchResult {
  products: RawProduct[];
  hasMore: boolean;
}

function generateId(productId: string, url: string): string {
  // Always append a short hash of the full URL to guarantee uniqueness. The
  // post-Feb-2026 Djak listing reuses the same Magento product-item-info id
  // across colour/variant tiles that have distinct URLs, so keying on productId
  // alone collided on the unique-id constraint and aborted the whole run with a
  // Prisma P2002 upsert error (mirrors the fix applied to the other stores).
  const hash = createHash("md5").update(url).digest("hex").slice(0, 8);
  if (productId) {
    return `${STORE}-${productId}-${hash}`;
  }
  // Fallback: use URL path only (without domain)
  const pathOnly = url
    .replace(/https?:\/\/[^\/]+/, "")  // Remove domain completely
    .replace(/\.html?$/i, "")  // Remove .html or .htm extension
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")  // Collapse multiple dashes
    .replace(/^-|-$/g, "")  // Trim leading/trailing dashes
    .slice(0, 70);
  return `${STORE}-${pathOnly}-${hash}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UrlInfo {
  gender: Gender;
  categories: string[];
}

function parseUrlInfo(url: string, name: string): UrlInfo {
  const urlLower = url.toLowerCase();
  const nameLower = name.toLowerCase();

  let gender: Gender = "unisex";
  const categories: string[] = [];

  // Try to extract from URL path structure: /muskarci/obuca/cipele/product-name
  const pathMatch = urlLower.match(/djaksport\.com\/(muskarci|zene|deca)\/([^\/]+)(?:\/([^\/]+))?/);

  if (pathMatch) {
    // Gender from URL path
    if (pathMatch[1] === "muskarci") gender = "muski";
    else if (pathMatch[1] === "zene") gender = "zenski";
    else if (pathMatch[1] === "deca") gender = "deciji";

    // Category from URL path (e.g., obuca, odeca, oprema)
    const mainCat = pathMatch[2];
    const subCat = pathMatch[3];

    if (mainCat && subCat) {
      // Map subcategories to our category format
      if (mainCat === "obuca") {
        if (subCat.includes("kopacke")) {
          categories.push("obuca/kopacke");
        } else if (subCat.includes("patike")) {
          categories.push("obuca/patike");
        } else if (subCat.includes("baletanke")) {
          categories.push("obuca/baletanke");
        } else if (subCat.includes("cipele")) {
          categories.push("obuca/cipele");
        } else if (subCat.includes("cizme")) {
          categories.push("obuca/cizme");
        } else if (subCat.includes("sandale")) {
          categories.push("obuca/sandale");
        } else if (subCat.includes("japanke") || subCat.includes("papuce")) {
          categories.push("obuca/papuce");
        } else {
          categories.push("obuca/" + subCat.replace("decije-", "").replace("muske-", "").replace("zenske-", ""));
        }
      } else if (mainCat === "odeca") {
        if (subCat.includes("kupaci") || subCat.includes("kupace") || subCat.includes("bikini")) {
          categories.push("odeca/kupaci");
        } else if (subCat.includes("jakne") || subCat.includes("prsluci")) {
          categories.push("odeca/jakne");
        } else if (subCat.includes("dukserice") || subCat.includes("duksevi")) {
          categories.push("odeca/duksevi");
        } else if (subCat.includes("trenerke") || subCat.includes("donji-delovi")) {
          categories.push("odeca/trenerke");
        } else if (subCat.includes("top")) {
          categories.push("odeca/topovi");
        } else if (subCat.includes("majice") || subCat.includes("dres")) {
          categories.push("odeca/majice");
        } else if (subCat.includes("halj")) {
          categories.push("odeca/haljine");
        } else if (subCat.includes("kosulj")) {
          categories.push("odeca/kosulje");
        } else if (subCat.includes("kombinezon")) {
          categories.push("odeca/kombinezoni");
        } else if (subCat.includes("sorc")) {
          categories.push("odeca/sortevi");
        } else {
          categories.push("odeca/" + subCat.replace("decija-", "").replace("muska-", "").replace("zenska-", ""));
        }
      } else if (mainCat === "oprema") {
        const mappedSubCat = subCat === "rancevi" ? "torbe" : subCat;
        categories.push("oprema/" + mappedSubCat);
      } else {
        categories.push(mainCat + "/" + subCat);
      }
    } else if (mainCat) {
      // New (post-Feb-2026) URL structure is flat — /muskarci/PRODUCT-SLUG with no
      // category subpath. Fall back to extracting category from the product name.
      const cat = mapCategory(name);
      if (cat) categories.push(cat);
    }
  } else {
    // Fallback: detect gender from product name
    if (urlLower.includes("za-muskarce") || nameLower.includes("za muškarce") || nameLower.includes("za muskarce")) {
      gender = "muski";
    } else if (urlLower.includes("za-zene") || nameLower.includes("za žene") || nameLower.includes("za zene")) {
      gender = "zenski";
    } else if (urlLower.includes("za-decake") || urlLower.includes("za-devojcice") || urlLower.includes("za-decu") ||
               nameLower.includes("za dečake") || nameLower.includes("za devojčice") || nameLower.includes("za decu") ||
               nameLower.includes("baby") || nameLower.includes("kids") || nameLower.includes("junior") || nameLower.includes(" jr ")) {
      gender = "deciji";
    }

    // Try to detect category from product name using shared mapper
    const cat = mapCategory(name);
    if (cat) categories.push(cat);
  }

  return { gender, categories };
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

async function fetchPageProducts(page: Page, pageNum: number): Promise<FetchResult> {
  const url = `${SALE_URL}?p=${pageNum}`;

  // Retry transient empty renders. Djak intermittently serves the correct page
  // (right <title>) but with the product grid not yet hydrated within the wait,
  // so a one-shot fetch yields 0 items even mid-catalogue. A single empty page
  // must NOT be mistaken for the end of pagination, so reload before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    try {
      await page.waitForSelector(".item.product.product-item", { timeout: 12000 });
    } catch {
      if (attempt < 3) {
        await sleep(1500);
        continue;
      }
      return { products: [], hasMore: false };
    }

    const result = (await page.evaluate(`
    (async function() {
      try {
        var results = [];
        var items = document.querySelectorAll('.item.product.product-item');

        items.forEach(function(el) {
          // Get product ID
          var productInfo = el.querySelector('[id^="product-item-info_"]');
          var productId = productInfo ? productInfo.id.replace('product-item-info_', '') : '';

          // Get product URL and name
          var linkEl = el.querySelector('.product-item-link');
          var name = linkEl ? linkEl.textContent.trim() : '';
          var url = linkEl ? linkEl.getAttribute('href') : '';
          if (url && !url.startsWith('http')) {
            url = 'https://www.djaksport.com' + url;
          }

          // Get image
          var imgEl = el.querySelector('.product-image-photo');
          var imageUrl = imgEl ? (imgEl.getAttribute('src') || '') : '';

          // Get prices from data attributes
          var salePriceEl = el.querySelector('[data-price-type="finalPrice"]');
          var originalPriceEl = el.querySelector('[data-price-type="oldPrice"]');

          var salePrice = salePriceEl ? parseInt(salePriceEl.getAttribute('data-price-amount') || '0', 10) : 0;
          var originalPrice = originalPriceEl ? parseInt(originalPriceEl.getAttribute('data-price-amount') || '0', 10) : 0;

          // Get discount from badge
          var discountEl = el.querySelector('.discount-badge span, .discount-percentage');
          var discountPercent = 0;
          if (discountEl) {
            var match = discountEl.textContent.match(/(\\d+)/);
            if (match) discountPercent = parseInt(match[1], 10);
          }
          if (!discountPercent && originalPrice > 0 && salePrice > 0) {
            discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
          }

          // Get brand from first word if uppercase
          var brand = null;
          var nameParts = name.split(' ');
          if (nameParts.length > 0 && nameParts[0] === nameParts[0].toUpperCase() && nameParts[0].length > 1) {
            brand = nameParts[0];
          }

          // Get sizes from Magento init script (sizes are loaded via JS, not in DOM)
          var sizes = [];
          var scriptEl = el.querySelector('script[type="text/x-magento-init"]');
          if (scriptEl) {
            var scriptContent = scriptEl.textContent || '';
            // Find size options in the JSON - pattern: "label":"XS" or "label":"42"
            var sizeMatches = scriptContent.match(/"label":"([^"]+)"/g);
            if (sizeMatches) {
              sizeMatches.forEach(function(match) {
                var sizeMatch = match.match(/"label":"([^"]+)"/);
                if (sizeMatch) {
                  var size = sizeMatch[1];
                  // Filter out non-size labels (colors, etc)
                  if (size && !sizes.includes(size) && size.length <= 5) {
                    sizes.push(size);
                  }
                }
              });
            }
          }

          if (name && url && originalPrice > 0 && salePrice > 0) {
            results.push({
              name: name,
              originalPrice: originalPrice,
              salePrice: salePrice,
              url: url,
              imageUrl: imageUrl,
              brand: brand,
              discountPercent: discountPercent,
              productId: productId,
              sizes: sizes
            });
          }
        });

        return { products: results, hasMore: items.length > 0 };
      } catch (err) {
        return { products: [], hasMore: false };
      }
    })()
  `) as FetchResult);

    // Got the grid but it was empty — retry once more before trusting it.
    if (result.products.length === 0 && attempt < 3) {
      await sleep(1500);
      continue;
    }
    return result;
  }

  return { products: [], hasMore: false };
}

async function scrapeDjakSport(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date();

  console.log("Starting DjakSport scraper with AJAX pagination...");
  console.log(`Target: ${SALE_URL}`);
  console.log(`Min discount: ${MIN_DISCOUNT}%`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Warm-up navigation: gives Cloudflare's JS challenge time to mint a
    // cf_clearance cookie that subsequent fast page.goto calls can reuse.
    console.log("Warming up Cloudflare session...");
    await page.goto(SALE_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await sleep(2000);

    // Paginate through all pages
    let currentPage = 1;
    let consecutiveEmpty = 0;

    while (currentPage <= MAX_PAGES && consecutiveEmpty < 2) {
      console.log(`\n=== Page ${currentPage} ===`);

      const { products } = await fetchPageProducts(page, currentPage);
      console.log(`Found ${products.length} products`);

      if (products.length === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) {
          console.log("No more products, stopping");
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

        if (product.salePrice >= product.originalPrice) continue;

        if (product.discountPercent >= MIN_DISCOUNT) {
          const { gender, categories } = parseUrlInfo(product.url, product.name);

          // Don't filter by sizes here — post-Feb-2026 Djak template doesn't expose
          // sizes in the listing markup, so checking would drop real deals. The
          // detail scraper visits each product and deletes items that are genuinely
          // out of stock (footwear/clothing with no sizes after detail check).

          // Extract brand using server-side logic (handles multi-word brands, aliases, filters genders/categories)
          const brand = extractBrandFromName(product.name);

          // Log first few products with categories for debugging
          if (totalDeals < 5) {
            console.log(`Saving: ${product.name.substring(0, 40)}... | brand=${brand} | gender=${gender} | categories=${JSON.stringify(categories)}`);
          }

          // Per-deal guard: one malformed product must not abort the run.
          try {
            await upsertDeal({
              id: generateId(product.productId, product.url),
              store: STORE,
              name: product.name,
              brand: brand,
              originalPrice: product.originalPrice,
              salePrice: product.salePrice,
              discountPercent: product.discountPercent,
              url: product.url,
              imageUrl: product.imageUrl,
              sizes: product.sizes,
              categories: categories,
              gender: gender,
            });
            totalDeals++;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push(`upsert ${product.url}: ${message}`);
            console.error(`Upsert failed for ${product.url}:`, message);
          }
        }
      }

      console.log(`Running total: ${totalDeals} deals (${totalScraped} scraped)`);

      currentPage++;
      await sleep(500 + Math.random() * 500);
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
  console.log(`Categories should be saved for products with extractable URL paths or name keywords`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }

  await disconnect();
}

if (process.argv[1]?.includes('djaksport.ts')) {
  scrapeDjakSport().catch(console.error);
}

export { scrapeDjakSport };
