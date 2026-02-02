import { JSDOM } from "jsdom";
import { getDealsForDetailScraping, updateDealDetails, deleteDealByUrl, disconnect, Gender } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";
import { mapGender } from "../../lib/gender-mapper";

const STORE = "planeta" as const;

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

function extractProductDetails(html: string, productName: string, productUrl: string): ProductDetails {
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
          result.gender = mapGender(genderKey) || null;
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
          const isNumeric = /^\d+(\.\d+)?$/.test(size);  // 37, 42.5
          const isFraction = /^\d+\s+\d+\/\d+$/.test(size);  // 37 1/3, 42 2/3
          const isLetterSize = /^[XSML]{1,3}$/.test(size.toUpperCase());  // S, M, XL, XXL
          const isCompoundSize = /^[XSML]{1,3}\/[XSML0-9]{1,3}$/i.test(size);  // M/L, XL/2
          if (isNumeric || isFraction || isLetterSize || isCompoundSize) {
            result.sizes.push(size);
          }
        }
      }
    }
  }

  // Fallback: use mapCategory on URL + product name
  if (result.categories.length === 0) {
    const category = mapCategory(productUrl + " " + productName);
    if (category) {
      result.categories.push(category);
    }
  }

  return result;
}

async function scrapePlanetaDetails(): Promise<void> {
  console.log("Starting Planeta Sport detail scraper (fetch mode)...");

  const deals = await getDealsForDetailScraping(STORE);
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

      const details = extractProductDetails(html, deal.name, deal.url);
      console.log(`  Gender: ${details.gender || "not detected"}`);
      console.log(`  Categories: ${details.categories.join(", ") || "none"}`);
      console.log(`  Sizes: ${details.sizes.length > 0 ? details.sizes.join(", ") : "none"}`);

      if (details.sizes.length === 0) {
        const cat = mapCategory(deal.name + " " + deal.url);
        if (cat && (cat.startsWith("obuca/") || cat.startsWith("odeca/"))) {
          await deleteDealByUrl(deal.url);
          console.log(`  ✗ Deleted (no sizes available)`);
          continue;
        }
      }

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
