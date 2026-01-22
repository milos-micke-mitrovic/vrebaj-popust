import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { upsertDeal, logScrapeRun, disconnect, cleanupStaleProducts, Store, Gender } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE: Store = "buzz";
const BASE_URL = "https://www.buzzsneakers.rs";
const SALE_PAGES = [
  { url: `${BASE_URL}/proizvodi/buzz-sale-men`, gender: "muski" as Gender },
  { url: `${BASE_URL}/proizvodi/buzz-sale-women`, gender: "zenski" as Gender },
  { url: `${BASE_URL}/proizvodi/buzz-sale-kids`, gender: "deciji" as Gender },
];
const MIN_DISCOUNT = 50;

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

// Extract categories from Buzz URL and product name
function extractCategories(url: string, name: string): string[] {
  const urlLower = url.toLowerCase();
  const nameLower = name.toLowerCase();
  const categories: string[] = [];

  // Check URL patterns first (more reliable)
  // Buzz URLs: /patike/, /odeca/, /polo-majica/, /majica/, /duks/, etc.

  // Obuća
  if (urlLower.includes("/patike/") || urlLower.includes("/sneakers/")) {
    categories.push("obuca/patike");
  } else if (urlLower.includes("/cipele/")) {
    categories.push("obuca/cipele");
  } else if (urlLower.includes("/cizme/") || urlLower.includes("/boots/")) {
    categories.push("obuca/cizme");
  } else if (urlLower.includes("/sandale/")) {
    categories.push("obuca/sandale");
  } else if (urlLower.includes("/japanke/") || urlLower.includes("/papuce/")) {
    categories.push("obuca/papuce");
  }

  // Odeća - Buzz uses various URL patterns
  if (urlLower.includes("/majica/") || urlLower.includes("/polo-majica/") || urlLower.includes("/t-shirt/")) {
    categories.push("odeca/majice");
  } else if (urlLower.includes("/duks/") || urlLower.includes("/hoodie/") || urlLower.includes("/dukserica/")) {
    categories.push("odeca/duksevi");
  } else if (urlLower.includes("/jakna/") || urlLower.includes("/jacket/") || urlLower.includes("/prsluci/") || urlLower.includes("/vest/")) {
    categories.push("odeca/jakne");
  } else if (urlLower.includes("/trenerka/") || urlLower.includes("/donji-deo-trenerke/") || urlLower.includes("/gornji-deo-trenerke/")) {
    categories.push("odeca/trenerke");
  } else if (urlLower.includes("/pantalone/") || urlLower.includes("/pants/")) {
    categories.push("odeca/pantalone");
  } else if (urlLower.includes("/sorc/") || urlLower.includes("/shorts/")) {
    categories.push("odeca/sorcevi");
  } else if (urlLower.includes("/helanke/") || urlLower.includes("/leggings/") || urlLower.includes("/tajice/")) {
    categories.push("odeca/helanke");
  } else if (urlLower.includes("/haljina/") || urlLower.includes("/dress/") || urlLower.includes("/suknja/")) {
    categories.push("odeca/haljine");
  } else if (urlLower.includes("/kosulja/") || urlLower.includes("/shirt/") || urlLower.includes("/kosulj")) {
    categories.push("odeca/kosulje");
  } else if (urlLower.includes("/kupaci/") || urlLower.includes("/kupace/") || urlLower.includes("/swimwear/") || urlLower.includes("/swimming/") || urlLower.includes("/bikini/")) {
    categories.push("odeca/kupaci");
  } else if (urlLower.includes("/kombinezon/") || urlLower.includes("/jumpsuit/") || urlLower.includes("/overall/")) {
    categories.push("odeca/kombinezoni");
  }

  // Oprema/Accessories
  if (urlLower.includes("/ranac/") || urlLower.includes("/backpack/") || urlLower.includes("/torba/") || urlLower.includes("/bag/")) {
    categories.push("oprema/torbe");
  } else if (urlLower.includes("/kapa/") || urlLower.includes("/kacket/") || urlLower.includes("/sesir/") || urlLower.includes("/hat/")) {
    categories.push("oprema/kape");
  } else if (urlLower.includes("/carape/") || urlLower.includes("/socks/")) {
    categories.push("oprema/carape");
  } else if (urlLower.includes("/rukavice/") || urlLower.includes("/gloves/")) {
    categories.push("oprema/rukavice");
  }

  // Fallback: extract from product name if no URL match
  if (categories.length === 0) {
    // Obuća - shoes first (most common)
    if (nameLower.includes("patike") || nameLower.includes("sneaker") || nameLower.includes("tenisice")) {
      categories.push("obuca/patike");
    } else if (nameLower.includes("cipele") || nameLower.includes("shoes")) {
      categories.push("obuca/cipele");
    } else if (nameLower.includes("čizme") || nameLower.includes("cizme") || nameLower.includes("boot") || nameLower.includes("gležnjač") || nameLower.includes("gleznjac")) {
      categories.push("obuca/cizme");
    } else if (nameLower.includes("sandale")) {
      categories.push("obuca/sandale");
    } else if (nameLower.includes("japanke") || nameLower.includes("papuče") || nameLower.includes("papuce") || nameLower.includes("natikač") || nameLower.includes("natikac")) {
      categories.push("obuca/papuce");
    // Odeća - clothing
    } else if (nameLower.includes("polo") || (nameLower.includes("majica") && !nameLower.includes("patike"))) {
      categories.push("odeca/majice");
    } else if (nameLower.includes("t-shirt") || nameLower.includes("tshirt") || nameLower.includes("tank top")) {
      categories.push("odeca/majice");
    } else if (nameLower.includes("duks") || nameLower.includes("hoodie") || nameLower.includes("dukserica") || nameLower.includes("sweatshirt")) {
      categories.push("odeca/duksevi");
    } else if (nameLower.includes("jakna") || nameLower.includes("jacket") || nameLower.includes("prslu") || nameLower.includes("vest") || nameLower.includes("windbreaker")) {
      categories.push("odeca/jakne");
    } else if (nameLower.includes("trenerka") || nameLower.includes("jogger") || nameLower.includes("donji deo") || nameLower.includes("gornji deo")) {
      categories.push("odeca/trenerke");
    } else if (nameLower.includes("pantalone") || nameLower.includes("pants")) {
      categories.push("odeca/pantalone");
    } else if (nameLower.includes("šorc") || nameLower.includes("sorc") || nameLower.includes("shorts") || nameLower.includes("bermude")) {
      categories.push("odeca/sorcevi");
    } else if (nameLower.includes("helanke") || nameLower.includes("leggings") || nameLower.includes("tajice") || nameLower.includes("tight")) {
      categories.push("odeca/helanke");
    } else if (nameLower.includes("košulj") || nameLower.includes("kosulj") || nameLower.includes("shirt")) {
      categories.push("odeca/kosulje");
    } else if (nameLower.includes("kupaći") || nameLower.includes("kupaci") || nameLower.includes("kupaće") || nameLower.includes("kupace") || nameLower.includes("bikini") || nameLower.includes("swimwear") || nameLower.includes("swimming")) {
      categories.push("odeca/kupaci");
    } else if (nameLower.includes("kombinezon") || nameLower.includes("jumpsuit") || nameLower.includes("overall")) {
      categories.push("odeca/kombinezoni");
    // Oprema - accessories
    } else if (nameLower.includes("ranac") || nameLower.includes("backpack") || nameLower.includes("torba") || nameLower.includes("bag") || nameLower.includes("torbica")) {
      categories.push("oprema/torbe");
    } else if (nameLower.includes("kapa") || nameLower.includes("kačket") || nameLower.includes("kacket") || nameLower.includes("cap") || nameLower.includes("šešir") || nameLower.includes("sesir") || nameLower.includes("beanie")) {
      categories.push("oprema/kape");
    } else if (nameLower.includes("čarape") || nameLower.includes("carape") || nameLower.includes("socks")) {
      categories.push("oprema/carape");
    }
  }

  return categories;
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
        // Get data from data attributes
        var name = el.dataset.productname || '';
        var brand = el.dataset.productbrand || null;
        var salePrice = el.dataset.productprice || '';

        // Buzz has stacked discounts - need to get the ORIGINAL price (highest one)
        // prev-price-third is the original price before all discounts
        var originalPrice = '';
        var prevPriceThird = el.querySelector('.prev-price.prev-old-price, .prev-price-third, .prev-price.prev-price-third');
        if (prevPriceThird) {
          originalPrice = prevPriceThird.textContent.trim().replace(/RSD/gi, '').trim();
        }
        // Fallback to data attribute if not found
        if (!originalPrice) {
          originalPrice = el.dataset.productprevprice || '';
        }

        // Don't use data-productdiscount as it only shows partial discount
        // We'll calculate the real discount from prices
        var discountPercent = null;

        // Get product link - check for all product types
        var linkEl = el.querySelector('.img-wrapper a[href]');
        if (!linkEl) {
          linkEl = el.querySelector('a[href*="buzzsneakers.rs/"]');
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

async function scrapeBuzz(): Promise<void> {
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  let totalScraped = 0;
  let totalDeals = 0;
  const scrapeStartTime = new Date(); // Track when scrape started for cleanup

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

        const products = await extractProducts(page);
        console.log(`Found ${products.length} product elements after loading all`);

        if (products.length === 0) {
          console.log("No products found");
          continue;
        }

        if (products.length > 0 && salePage === SALE_PAGES[0]) {
          console.log("Sample product:", JSON.stringify(products[0], null, 2));
        }

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
            const categories = extractCategories(product.url, product.name);

            // Debug: log clothing items
            if (categories.some(c => c.startsWith("odeca/")) || product.name.toLowerCase().includes("majic") || product.name.toLowerCase().includes("duks") || product.name.toLowerCase().includes("jakn")) {
              console.log(`  [CLOTHING] ${product.name}`);
              console.log(`    URL: ${product.url}`);
              console.log(`    Categories: ${categories.join(", ") || "NONE"}`);
            }

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
              gender: salePage.gender,
              categories,
            });
            sectionDeals++;
            totalDeals++;
          }
        }

        totalScraped += products.length;
        console.log(
          `Section ${salePage.gender}: ${sectionDeals} deals with ${MIN_DISCOUNT}%+ (total products: ${products.length})`
        );
        console.log(`Running total: ${totalDeals} deals (${totalScraped} scraped)`);

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

  // Log scrape run
  await logScrapeRun(STORE, totalScraped, totalDeals, errors);

  // Clean up stale products (only if we found enough products)
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
if (process.argv[1]?.includes('buzz.ts') && !process.argv[1]?.includes('details')) {
  scrapeBuzz().catch(console.error);
}

export { scrapeBuzz };
