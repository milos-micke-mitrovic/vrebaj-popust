import { JSDOM } from "jsdom";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

const STORE = "sportvision" as const;

interface ProductDetails {
  sizes: string[];
  categories: string[];
  gender: Gender | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGender(text: string): Gender | null {
  const lower = text.toLowerCase();
  if (lower.includes("muškarce") || lower.includes("muskarce") || lower === "m") return "muski";
  if (lower.includes("žene") || lower.includes("zene") || lower === "ž" || lower === "z") return "zenski";
  if (lower.includes("decu") || lower.includes("dečake") || lower.includes("devojčice")) return "deciji";
  return null;
}

function mapCategory(categoryText: string): string | null {
  const lower = categoryText.toLowerCase();

  if (lower.includes("patike")) return "obuca/patike";
  if (lower.includes("cipele")) return "obuca/cipele";
  if (lower.includes("čizme") || lower.includes("cizme")) return "obuca/cizme";
  if (lower.includes("sandale")) return "obuca/sandale";
  if (lower.includes("papuč") || lower.includes("papuc")) return "obuca/papuce";
  if (lower.includes("majic")) return "odeca/majice";
  if (lower.includes("duks")) return "odeca/duksevi";
  if (lower.includes("jakn")) return "odeca/jakne";
  if (lower.includes("šorc") || lower.includes("sorc")) return "odeca/sorcevi";
  if (lower.includes("trenerka") || lower.includes("trenerke")) return "odeca/trenerke";
  if (lower.includes("helan")) return "odeca/helanke";
  if (lower.includes("ranac") || lower.includes("rančev")) return "oprema/rancevi";
  if (lower.includes("torb")) return "oprema/torbe";
  if (lower.includes("kapa") || lower.includes("šešir")) return "oprema/kape";
  if (lower.includes("čarap") || lower.includes("carap")) return "oprema/carape";

  return null;
}

async function fetchProductPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "sr,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.log(`  HTTP ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Fetch error: ${message}`);
    return null;
  }
}

function extractProductDetails(html: string): ProductDetails {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const result: ProductDetails = {
    sizes: [],
    categories: [],
    gender: null,
  };

  // Extract sizes from .product-attributes li:not(.disabled) with data-productsize-name
  // Only get plain "Velicina", not "Velicina EU", "Velicina CM"
  const sizeSection = doc.querySelector('.product-attributes');
  if (sizeSection) {
    // Find the header that says just "Veličina" (not "Veličina EU" or "Veličina CM")
    const headers = sizeSection.querySelectorAll('.product-attribute-header');
    for (const header of headers) {
      const headerText = header.textContent?.trim() || "";
      // Only process plain "Veličina" section
      if (headerText === "Veličina" || headerText === "Velicina") {
        // Get the next sibling which should contain the size list
        let sibling = header.nextElementSibling;
        while (sibling) {
          const sizeItems = sibling.querySelectorAll('li:not(.disabled)');
          for (const item of sizeItems) {
            const size = item.getAttribute('data-productsize-name') ||
                        item.querySelector('.original-size')?.textContent?.trim() ||
                        item.textContent?.trim();
            if (size && !result.sizes.includes(size)) {
              result.sizes.push(size);
            }
          }
          if (sizeItems.length > 0) break;
          sibling = sibling.nextElementSibling;
        }
        break;
      }
    }
  }

  // Fallback: try generic size selectors if no sizes found
  if (result.sizes.length === 0) {
    const sizeElements = doc.querySelectorAll('.product-attributes li:not(.disabled)[data-productsize-name]');
    for (const el of sizeElements) {
      const size = el.getAttribute('data-productsize-name');
      if (size && !result.sizes.includes(size)) {
        result.sizes.push(size);
      }
    }
  }

  // Extract gender from Specifikacija table - tr.attr-pol
  const genderRow = doc.querySelector('tr.attr-pol');
  if (genderRow) {
    const cells = genderRow.querySelectorAll('td');
    if (cells.length >= 2) {
      const genderText = cells[1].textContent?.trim() || "";
      result.gender = parseGender(genderText);
    }
  }

  // Extract category from Specifikacija table - row with "Kategorija"
  const specTable = doc.querySelector('.specification-table, table');
  if (specTable) {
    const rows = specTable.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const label = cells[0].textContent?.trim().toLowerCase() || "";
        if (label === "kategorija" || label.includes("kategorija")) {
          const categoryText = cells[1].textContent?.trim() || "";
          const category = mapCategory(categoryText);
          if (category && !result.categories.includes(category)) {
            result.categories.push(category);
          }
        }
      }
    }
  }

  // Fallback: extract categories from breadcrumbs
  if (result.categories.length === 0) {
    const breadcrumbs = doc.querySelectorAll('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a');
    for (const el of breadcrumbs) {
      const text = el.textContent?.trim() || "";
      const category = mapCategory(text);
      if (category && !result.categories.includes(category)) {
        result.categories.push(category);
      }
    }
  }

  // Fallback: check URL for gender hints if not found in table
  if (!result.gender) {
    const urlMatch = html.match(/og:url[^>]*content="([^"]+)"/i);
    if (urlMatch) {
      const url = urlMatch[1].toLowerCase();
      if (url.includes('/muskarci') || url.includes('/men')) result.gender = 'muski';
      else if (url.includes('/zene') || url.includes('/women')) result.gender = 'zenski';
      else if (url.includes('/deca') || url.includes('/kids')) result.gender = 'deciji';
    }
  }

  return result;
}

async function scrapeSportVisionDetails(): Promise<void> {
  console.log("Starting SportVision detail scraper (fetch mode)...");

  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const deal of deals) {
    console.log(`\n[${processed + 1}/${deals.length}] ${deal.name}`);
    console.log(`  URL: ${deal.url}`);

    try {
      const html = await fetchProductPage(deal.url);

      if (!html) {
        errors++;
        continue;
      }

      const details = extractProductDetails(html);
      console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);
      console.log(`  Categories: ${details.categories.join(", ") || "none"}`);
      console.log(`  Gender: ${details.gender || "not detected"}`);

      // Only update categories/gender if we found values (don't overwrite existing)
      await updateDealDetails(deal.url, {
        sizes: details.sizes,
        ...(details.categories.length > 0 && { categories: details.categories }),
        ...(details.gender && { gender: details.gender }),
      });

      processed++;
      console.log(`  ✓ Updated`);

      // Small delay between requests to be polite
      await sleep(200 + Math.random() * 300);

    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Error: ${message}`);
    }
  }

  console.log("\n=== Detail Scraping Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('sportvision-details.ts')) {
  scrapeSportVisionDetails().catch(console.error);
}

export { scrapeSportVisionDetails };
