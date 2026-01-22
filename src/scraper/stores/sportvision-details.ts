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

  if (lower.includes("kopack") || lower.includes("kopačk")) return "obuca/kopacke";
  if (lower.includes("patike")) return "obuca/patike";
  if (lower.includes("baletank")) return "obuca/baletanke";
  if (lower.includes("cipele")) return "obuca/cipele";
  if (lower.includes("čizme") || lower.includes("cizme")) return "obuca/cizme";
  if (lower.includes("sandale")) return "obuca/sandale";
  if (lower.includes("papuč") || lower.includes("papuc")) return "obuca/papuce";
  if (lower.includes(" top") || lower.startsWith("top ") || lower.includes("sports bra") || lower.includes("tank top") || lower.includes("crop top")) return "odeca/topovi";
  if (lower.includes("majic")) return "odeca/majice";
  if (lower.includes("duks")) return "odeca/duksevi";
  if (lower.includes("jakn")) return "odeca/jakne";
  if (lower.includes("šorc") || lower.includes("sorc")) return "odeca/sortevi";
  if (lower.includes("trenerka") || lower.includes("trenerke")) return "odeca/trenerke";
  if (lower.includes("pantalon")) return "odeca/pantalone";
  if (lower.includes("helan")) return "odeca/helanke";
  if (lower.includes("halj")) return "odeca/haljine";
  if (lower.includes("košulj") || lower.includes("kosulj")) return "odeca/kosulje";
  if (lower.includes("kupaći") || lower.includes("kupaci") || lower.includes("kupaće") || lower.includes("kupace") || lower.includes("bikini")) return "odeca/kupaci";
  if (lower.includes("kombinezon") || lower.includes("jumpsuit") || lower.includes("overall")) return "odeca/kombinezoni";
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

  // Fallback: extract category from URL if not found (e.g., /kopacke/xxx, /patike/xxx)
  if (result.categories.length === 0) {
    const urlMatch = html.match(/og:url[^>]*content="([^"]+)"/i);
    if (urlMatch) {
      const url = urlMatch[1].toLowerCase();
      if (url.includes('/kopacke/') || url.includes('/kopacke-')) result.categories.push('obuca/kopacke');
      else if (url.includes('/patike/') || url.includes('/patike-')) result.categories.push('obuca/patike');
      else if (url.includes('/cipele/') || url.includes('/cipele-')) result.categories.push('obuca/cipele');
      else if (url.includes('/cizme/') || url.includes('/cizme-')) result.categories.push('obuca/cizme');
      else if (url.includes('/sandale/') || url.includes('/sandale-')) result.categories.push('obuca/sandale');
      else if (url.includes('/papuce/') || url.includes('/papuce-')) result.categories.push('obuca/papuce');
      else if (url.includes('/japanke/') || url.includes('/japanke-')) result.categories.push('obuca/papuce');
      else if (url.includes('/top-') || url.includes('-top-')) result.categories.push('odeca/topovi');
      else if (url.includes('/majica') || url.includes('/majice')) result.categories.push('odeca/majice');
      else if (url.includes('/duks')) result.categories.push('odeca/duksevi');
      else if (url.includes('/jakna') || url.includes('/jakne')) result.categories.push('odeca/jakne');
      else if (url.includes('/sorc') || url.includes('/sortevi')) result.categories.push('odeca/sortevi');
      else if (url.includes('/trenerka') || url.includes('/trenerke')) result.categories.push('odeca/trenerke');
      else if (url.includes('/pantalon')) result.categories.push('odeca/pantalone');
      else if (url.includes('/helanke')) result.categories.push('odeca/helanke');
      else if (url.includes('/haljin')) result.categories.push('odeca/haljine');
      else if (url.includes('/kosulj')) result.categories.push('odeca/kosulje');
      else if (url.includes('/kupaci') || url.includes('/kupace') || url.includes('/swimwear') || url.includes('/swimming') || url.includes('/bikini')) result.categories.push('odeca/kupaci');
      else if (url.includes('/kombinezon') || url.includes('/jumpsuit') || url.includes('/overall')) result.categories.push('odeca/kombinezoni');
      else if (url.includes('/torba') || url.includes('/torbe')) result.categories.push('oprema/torbe');
      else if (url.includes('/ranac') || url.includes('/rancevi')) result.categories.push('oprema/rancevi');
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
