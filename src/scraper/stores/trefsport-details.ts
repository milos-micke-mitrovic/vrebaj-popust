import { JSDOM } from "jsdom";
import { getDealsWithoutDetails, updateDealDetails, deleteDealByUrl, disconnect } from "../db-writer";
import type { Gender } from "@prisma/client";

const STORE = "trefsport" as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProductDetails {
  sizes: string[];
  description: string | null;
  categories: string[];
  gender: Gender | null;
}

function mapCategory(text: string): string | null {
  const lower = text.toLowerCase();

  // Footwear
  if (lower.includes("kopack") || lower.includes("kopačk")) return "obuca/kopacke";
  if (lower.includes("baletank")) return "obuca/baletanke";
  if (lower.includes("patike") || lower.includes("sneaker")) return "obuca/patike";
  if (lower.includes("cipele")) return "obuca/cipele";
  if (lower.includes("čizme") || lower.includes("cizme") || lower.includes("boots") || lower.includes("čizm")) return "obuca/cizme";
  if (lower.includes("sandale")) return "obuca/sandale";
  if (lower.includes("papuč") || lower.includes("papuc")) return "obuca/papuce";

  // Clothing
  if (lower.includes("kupaći") || lower.includes("kupaci") || lower.includes("kupać") || lower.includes("bikini")) return "odeca/kupaci";
  if (lower.includes("ski jakn") || lower.includes("jakn") || lower.includes("jacket")) return "odeca/jakne";
  if (lower.includes("prsluk") || lower.includes("prsluci") || lower.includes("vest")) return "odeca/prsluci";
  if (lower.includes("duks") || lower.includes("hoodie") || lower.includes("sweatshirt")) return "odeca/duksevi";
  if (lower.includes("majic") || lower.includes("t-shirt")) return "odeca/majice";
  if (lower.includes("helank") || lower.includes("tajice") || lower.includes("legging")) return "odeca/helanke";
  if (lower.includes("šorc") || lower.includes("sorc") || lower.includes("shorts") || lower.includes("bermude")) return "odeca/sortevi";
  if (lower.includes("pantalon") || lower.includes("ski pantalon") || lower.includes("pants")) return "odeca/pantalone";
  if (lower.includes("trenerk") || lower.includes("tracksuit")) return "odeca/trenerke";
  if (lower.includes("halj") || lower.includes("dress")) return "odeca/haljine";
  if (lower.includes("kombinezon") || lower.includes("overall")) return "odeca/kombinezoni";

  // Accessories
  if (lower.includes("ranac") || lower.includes("ruksak") || lower.includes("backpack")) return "oprema/rancevi";
  if (lower.includes("torb")) return "oprema/torbe";
  if (lower.includes("kapa") || lower.includes("kačket") || lower.includes("kacket") || lower.includes("šešir")) return "oprema/kape";
  if (lower.includes("rukavic") || lower.includes("gloves")) return "oprema/rukavice";
  if (lower.includes("čarap") || lower.includes("carap") || lower.includes("socks")) return "oprema/carape";
  if (lower.includes("šal") || lower.includes("scarf")) return "oprema/salovi";

  return null;
}

function mapGender(polValue: string): Gender {
  const lower = polValue.toLowerCase();

  if (lower.includes("dečij") || lower.includes("decij") || lower.includes("deč") || lower.includes("dec") ||
      lower.includes("kid") || lower.includes("junior") || lower.includes("beb")) {
    return "deciji";
  }
  if (lower.includes("žen") || lower.includes("zen") || lower.includes("women") || lower.includes("dame")) {
    return "zenski";
  }
  if (lower.includes("muš") || lower.includes("mus") || lower.includes("men") || lower.includes("muški") || lower.includes("muski")) {
    return "muski";
  }

  return "unisex";
}

async function fetchProductDetails(url: string, productName: string): Promise<ProductDetails> {
  const result: ProductDetails = { sizes: [], description: null, categories: [], gender: null };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "sr-RS,sr;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract sizes from configurator options
    // Only select sizes where the input has is-combinable class (in stock)
    // Inputs without is-combinable are disabled/out of stock
    const sizeOptions = doc.querySelectorAll(".product-detail-configurator-option");
    const seenSizes = new Set<string>();
    for (const option of sizeOptions) {
      const input = option.querySelector("input.product-detail-configurator-option-input");
      if (!input || !input.classList.contains("is-combinable")) continue;
      const label = option.querySelector("label");
      const size = label?.textContent?.trim();
      if (size && !seenSizes.has(size)) {
        seenSizes.add(size);
        result.sizes.push(size);
      }
    }

    // Extract properties from the table (Pol, Kategorije, Namena, etc.)
    const propRows = doc.querySelectorAll(".product-detail-properties-table tr.properties-row");
    let kategorijaValue = "";

    for (const row of propRows) {
      const labelEl = row.querySelector("th.properties-label");
      const valueEl = row.querySelector("td.properties-value");
      if (!labelEl || !valueEl) continue;

      const label = labelEl.textContent?.trim().replace(":", "") || "";
      // Get all span values joined
      const spans = valueEl.querySelectorAll("span");
      const values: string[] = [];
      for (const span of spans) {
        const text = span.textContent?.trim();
        if (text) values.push(text);
      }
      const value = values.join(", ");

      if (label === "Pol") {
        result.gender = mapGender(value);
      }
      if (label === "Kategorije") {
        kategorijaValue = value;
      }
    }

    // Map category from Kategorije property value
    if (kategorijaValue) {
      const category = mapCategory(kategorijaValue);
      if (category) {
        result.categories.push(category);
      }
    }

    // Fallback: map category from product name
    if (result.categories.length === 0 && productName) {
      const category = mapCategory(productName);
      if (category) {
        result.categories.push(category);
      }
    }

    // Fallback: infer gender from product name if not found in properties
    if (!result.gender && productName) {
      const nameLower = productName.toLowerCase();
      if (nameLower.includes("žensk") || nameLower.includes("zensk") || nameLower.includes("women")) {
        result.gender = "zenski";
      } else if (nameLower.includes("mušk") || nameLower.includes("musk") || nameLower.includes("men")) {
        result.gender = "muski";
      } else if (nameLower.includes("dečij") || nameLower.includes("decij") || nameLower.includes("kid") || nameLower.includes("junior")) {
        result.gender = "deciji";
      }
    }

    // Extract description
    const descEl = doc.querySelector(".product-detail-description-text");
    if (descEl) {
      result.description = descEl.textContent?.trim().substring(0, 500) || null;
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch: ${message}`);
  }

  return result;
}

async function scrapeTrefSportDetails(): Promise<void> {
  console.log("Starting Tref Sport detail scraper...");

  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  let processed = 0;
  let updated = 0;
  let deleted = 0;
  let errors = 0;
  const startTime = Date.now();

  for (const deal of deals) {
    const progress = `[${processed + 1}/${deals.length}]`;

    try {
      const details = await fetchProductDetails(deal.url, deal.name);

      // If no sizes found, product is out of stock - delete it
      if (details.sizes.length === 0) {
        await deleteDealByUrl(deal.url);
        deleted++;
        console.log(`${progress} ✗ ${deal.name.substring(0, 40)}... | no sizes - DELETED`);
      } else {
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          description: details.description,
          ...(details.categories.length > 0 && { categories: details.categories }),
          ...(details.gender && { gender: details.gender }),
        });
        updated++;
        console.log(`${progress} ✓ ${deal.name.substring(0, 40)}... | sizes: ${details.sizes.join(", ")} | gender: ${details.gender || "unknown"} | cat: ${details.categories.join(", ") || "none"}`);
      }

      processed++;

      // Polite delay
      await sleep(500 + Math.random() * 500);

    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ✗ ${deal.name.substring(0, 40)}... | ${message}`);

      await sleep(2000);
    }

    // Progress report every 50 products
    if (processed % 50 === 0 && processed > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (deals.length - processed) / rate;
      console.log(`\n--- Progress: ${processed}/${deals.length} | Rate: ${rate.toFixed(1)}/sec | ETA: ${(remaining / 60).toFixed(1)} min ---\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log("\n=== Detail Scraping Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Updated with details: ${updated}`);
  console.log(`Deleted (no sizes): ${deleted}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`Average rate: ${(processed / totalTime).toFixed(2)} products/second`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes("trefsport-details.ts")) {
  scrapeTrefSportDetails().catch(console.error);
}

export { scrapeTrefSportDetails };
