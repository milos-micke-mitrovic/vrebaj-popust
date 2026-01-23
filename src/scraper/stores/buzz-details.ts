import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { getDealsWithoutDetails, updateDealDetails, disconnect } from "../db-writer";

puppeteer.use(StealthPlugin());

const STORE = "buzz" as const;

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

interface ProductDetails {
  sizes: string[];
}

// Extract categories from Buzz URL and product name (same logic as buzz.ts)
function extractCategoriesFromUrl(url: string, name: string): string[] {
  const urlLower = url.toLowerCase();
  const nameLower = name.toLowerCase();
  const categories: string[] = [];

  // Check URL patterns first (more reliable)
  // Obuća
  if (urlLower.includes("/patike/") || urlLower.includes("/sneakers/")) {
    categories.push("obuca/patike");
  } else if (urlLower.includes("/baletanke/")) {
    categories.push("obuca/baletanke");
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
    categories.push("odeca/sortevi");
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
    if (nameLower.includes("patike") || nameLower.includes("sneaker") || nameLower.includes("tenisice")) {
      categories.push("obuca/patike");
    } else if (nameLower.includes("baletank")) {
      categories.push("obuca/baletanke");
    } else if (nameLower.includes("cipele") || nameLower.includes("shoes")) {
      categories.push("obuca/cipele");
    } else if (nameLower.includes("čizme") || nameLower.includes("cizme") || nameLower.includes("boot")) {
      categories.push("obuca/cizme");
    } else if (nameLower.includes("sandale")) {
      categories.push("obuca/sandale");
    } else if (nameLower.includes("japanke") || nameLower.includes("papuče") || nameLower.includes("papuce")) {
      categories.push("obuca/papuce");
    } else if (nameLower.startsWith("top ") || nameLower.includes(" top ") || nameLower.includes("sports bra") || nameLower.includes("tank top") || nameLower.includes("crop top") || nameLower.includes(" bra ") || nameLower.endsWith(" bra") || nameLower.startsWith("bra ")) {
      categories.push("odeca/topovi");
    } else if (nameLower.includes("polo") || nameLower.includes("majica")) {
      categories.push("odeca/majice");
    } else if (nameLower.includes("t-shirt") || nameLower.includes("tshirt")) {
      categories.push("odeca/majice");
    } else if (nameLower.includes("duks") || nameLower.includes("hoodie") || nameLower.includes("dukserica") || nameLower.includes("sweatshirt")) {
      categories.push("odeca/duksevi");
    } else if (nameLower.includes("jakna") || nameLower.includes("jacket") || nameLower.includes("prslu") || nameLower.includes("vest") || nameLower.includes("windbreaker")) {
      categories.push("odeca/jakne");
    } else if (nameLower.includes("kupaći") || nameLower.includes("kupaci") || nameLower.includes("kupaće") || nameLower.includes("kupace") || nameLower.includes("bikini") || nameLower.includes("swimwear") || nameLower.includes("swimming")) {
      categories.push("odeca/kupaci");
    } else if (nameLower.includes("trenerka") || nameLower.includes("jogger") || nameLower.includes("donji deo") || nameLower.includes("gornji deo")) {
      categories.push("odeca/trenerke");
    } else if (nameLower.includes("pantalone") || nameLower.includes("pants")) {
      categories.push("odeca/pantalone");
    } else if (nameLower.includes("šorc") || nameLower.includes("sorc") || nameLower.includes("shorts") || nameLower.includes("bermude")) {
      categories.push("odeca/sortevi");
    } else if (nameLower.includes("helanke") || nameLower.includes("leggings") || nameLower.includes("tajice") || nameLower.includes("tight")) {
      categories.push("odeca/helanke");
    } else if (nameLower.includes("košulj") || nameLower.includes("kosulj") || nameLower.includes("shirt")) {
      categories.push("odeca/kosulje");
    } else if (nameLower.includes("kombinezon") || nameLower.includes("jumpsuit") || nameLower.includes("overall")) {
      categories.push("odeca/kombinezoni");
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

async function extractProductDetails(page: Page): Promise<ProductDetails> {
  return page.evaluate(`
    (function() {
      var result = {
        sizes: []
      };

      // Extract sizes from Buzz size selector
      // Buzz uses: <li data-productsize-name="36.5" class="ease">36.5</li>
      // Out of stock sizes have class "disabled"
      var sizeElements = document.querySelectorAll('li[data-productsize-name]:not(.disabled)');
      sizeElements.forEach(function(el) {
        var size = el.getAttribute('data-productsize-name') || el.textContent.trim() || '';
        if (size && !result.sizes.includes(size)) {
          result.sizes.push(size);
        }
      });

      return result;
    })()
  `) as Promise<ProductDetails>;
}

async function scrapeBuzzDetails(): Promise<void> {
  console.log("Starting Buzz Sneakers detail scraper...");

  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  const browser = await launchBrowser();
  let processed = 0;
  let errors = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const deal of deals) {
      console.log(`\n[${processed + 1}/${deals.length}] ${deal.name}`);
      console.log(`  URL: ${deal.url}`);

      try {
        await page.goto(deal.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        await sleep(1000 + Math.random() * 1000);

        const details = await extractProductDetails(page);

        // Extract categories from URL (more reliable than page content)
        const categories = extractCategoriesFromUrl(deal.url, deal.name);

        console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);
        console.log(`  Categories: ${categories.join(", ") || "none (keeping existing)"}`);

        // Only update sizes and categories (don't overwrite gender - it's set correctly by list scraper)
        // Only update categories if we extracted some
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          ...(categories.length > 0 && { categories }),
        });

        processed++;
        console.log(`  ✓ Updated`);

        await sleep(1500 + Math.random() * 1500);

      } catch (err) {
        errors++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ Error: ${message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== Detail Scraping Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('buzz-details.ts')) {
  scrapeBuzzDetails().catch(console.error);
}

export { scrapeBuzzDetails };
