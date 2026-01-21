import { JSDOM } from "jsdom";
import { getDealsWithoutDetails, updateDealDetails, disconnect, Gender } from "../db-writer";

const STORE = "planeta" as const;

// Map Planeta's Pol values to our Gender type
const GENDER_MAP: Record<string, Gender> = {
  "MUSKARCI": "muski",
  "MUŠKARCI": "muski",
  "ZENE": "zenski",
  "ŽENE": "zenski",
  "DEČACI": "deciji",
  "DECACI": "deciji",
  "DEVOJČICE": "deciji",
  "DEVOJCICE": "deciji",
  "DECA": "deciji",
  "UNISEX": "unisex",
};

function mapCategory(vrsta: string): string | null {
  const upper = vrsta.toUpperCase().trim();

  // Footwear - check for keywords
  if (upper.includes("PATIKE") || upper.includes("PATIKA")) return "obuca/patike";
  if (upper.includes("CIPELE") || upper.includes("CIPELA")) return "obuca/cipele";
  if (upper.includes("ČIZME") || upper.includes("CIZME") || upper.includes("ČIZMA") || upper.includes("CIZMA")) return "obuca/cizme";
  if (upper.includes("PAPUČE") || upper.includes("PAPUCE") || upper.includes("PAPUČA") || upper.includes("PAPUCA")) return "obuca/papuce";
  if (upper.includes("SANDALE") || upper.includes("SANDALA")) return "obuca/sandale";
  if (upper.includes("JAPANKE") || upper.includes("JAPANKA")) return "obuca/japanke";
  if (upper.includes("KLOMPE") || upper.includes("KLOMPA")) return "obuca/klompe";
  if (upper.includes("KOPAČKE") || upper.includes("KOPACKE")) return "obuca/kopacke";

  // Tops
  if (upper.includes("MAJIC")) return "odeca/majice";
  if (upper.includes("DUKS")) return "odeca/duksevi";
  if (upper.includes("JAKN")) return "odeca/jakne";
  if (upper.includes("PRSLUK") || upper.includes("PRSLUC")) return "odeca/prsluci";
  if (upper.includes("VETROVK")) return "odeca/vetrovke";

  // Bottoms
  if (upper.includes("TRENERKA") || upper.includes("TRENERKE")) return "odeca/trenerke";
  if (upper.includes("DONJI DEL")) return "odeca/trenerke";
  if (upper.includes("GORNJI DEL")) return "odeca/duksevi";
  if (upper.includes("PANTALON")) return "odeca/pantalone";
  if (upper.includes("HELANKE") || upper.includes("HELANKI")) return "odeca/helanke";
  if (upper.includes("HALJ")) return "odeca/haljine";
  if (upper.includes("KOŠULJ") || upper.includes("KOSULJ")) return "odeca/kosulje";
  if (upper.includes("ŠORC") || upper.includes("SORC") || upper.includes("BERMUD")) return "odeca/sorcevi";

  // Swimwear
  if (upper.includes("KUPAĆI") || upper.includes("KUPACI") || upper.includes("KUPAĆE") || upper.includes("KUPACE") || upper.includes("BIKINI")) return "odeca/kupaci";

  // Jumpsuits
  if (upper.includes("KOMBINEZON") || upper.includes("JUMPSUIT") || upper.includes("OVERALL")) return "odeca/kombinezoni";

  // Accessories
  if (upper.includes("KAPA") || upper.includes("KAPE")) return "oprema/kape";
  if (upper.includes("KAČKET") || upper.includes("KACKET")) return "oprema/kacketi";
  if (upper.includes("ČARAP") || upper.includes("CARAP")) return "oprema/carape";
  if (upper.includes("TORB")) return "oprema/torbe";
  if (upper.includes("RANČ") || upper.includes("RANC")) return "oprema/rancevi";
  if (upper.includes("RUKAVIC")) return "oprema/rukavice";
  if (upper.includes("ŠAL") || upper.includes("SAL")) return "oprema/salovi";

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProductDetails {
  brand: string | null;
  gender: Gender | null;
  categories: string[];
  sizes: string[];
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
    brand: null,
    gender: null,
    categories: [],
    sizes: [],
  };

  // Extract from Specifikacija table
  const table = doc.querySelector('#product-attribute-specs-table');
  if (table) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const label = row.querySelector('th');
      const value = row.querySelector('td');
      if (label && value) {
        const labelText = label.textContent?.trim().toUpperCase() || "";
        const valueText = value.textContent?.trim() || "";

        if (labelText === 'BREND') {
          const brandLink = value.querySelector('a');
          result.brand = brandLink ? brandLink.textContent?.trim() || null : valueText || null;
        } else if (labelText === 'POL') {
          const genderKey = valueText.toUpperCase();
          result.gender = GENDER_MAP[genderKey] || null;
        } else if (labelText === 'VRSTA') {
          const category = mapCategory(valueText);
          if (category && !result.categories.includes(category)) {
            result.categories.push(category);
          }
        }
      }
    }
  }

  // Extract sizes from Magento JSON config
  // Find "code":"size" then extract "label" values from the options array
  const codeIdx = html.indexOf('"code":"size"');
  if (codeIdx > 0) {
    const chunk = html.substring(codeIdx, codeIdx + 5000);
    const optionsMatch = chunk.match(/"options"\s*:\s*\[([^\]]+)\]/);
    if (optionsMatch) {
      const labelMatches = optionsMatch[1].matchAll(/"label"\s*:\s*"([^"]+)"/g);
      for (const m of labelMatches) {
        const size = m[1];
        if (size && !result.sizes.includes(size)) {
          const isNumeric = /^\d+(\.\d+)?$/.test(size);
          const isLetterSize = /^[XSML]{1,3}$/.test(size.toUpperCase());
          if (isNumeric || isLetterSize) {
            result.sizes.push(size);
          }
        }
      }
    }
  }

  // Fallback: extract from URL if no category found (e.g., /patike-xyz.html)
  if (result.categories.length === 0) {
    const urlMatch = html.match(/og:url[^>]*content="([^"]+)"/i);
    if (urlMatch) {
      const url = urlMatch[1].toLowerCase();
      if (url.includes('/patike-') || url.includes('/patike/')) result.categories.push('obuca/patike');
      else if (url.includes('/cipele-') || url.includes('/cipele/')) result.categories.push('obuca/cipele');
      else if (url.includes('/jakn')) result.categories.push('odeca/jakne');
      else if (url.includes('/duks')) result.categories.push('odeca/duksevi');
      else if (url.includes('/majic')) result.categories.push('odeca/majice');
      else if (url.includes('/kosulj')) result.categories.push('odeca/kosulje');
      else if (url.includes('/kupaci') || url.includes('/kupace') || url.includes('/swimwear') || url.includes('/swimming') || url.includes('/bikini')) result.categories.push('odeca/kupaci');
      else if (url.includes('/kombinezon') || url.includes('/jumpsuit') || url.includes('/overall')) result.categories.push('odeca/kombinezoni');
    }
  }

  return result;
}

async function scrapePlanetaDetails(): Promise<void> {
  console.log("Starting Planeta Sport detail scraper (fetch mode)...");

  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

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
      console.log(`  Gender: ${details.gender || "not detected"}`);
      console.log(`  Categories: ${details.categories.join(", ") || "none"}`);
      console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);

      // Update deal in database
      await updateDealDetails(deal.url, {
        sizes: details.sizes,
        ...(details.categories.length > 0 && { categories: details.categories }),
        ...(details.gender && { gender: details.gender }),
      });

      processed++;
      console.log(`  ✓ Updated`);

      // Small delay between requests
      await sleep(200 + Math.random() * 300);

    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Error: ${message}`);
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
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('planeta-details.ts')) {
  scrapePlanetaDetails().catch(console.error);
}

export { scrapePlanetaDetails };
