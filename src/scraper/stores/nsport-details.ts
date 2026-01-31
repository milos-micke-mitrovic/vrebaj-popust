import { getDealsWithoutDetails, updateDealDetails, disconnect } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";
import { mapGender } from "../../lib/gender-mapper";

const STORE = "nsport" as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProductDetails {
  sizes: string[];
}

async function fetchProductDetails(url: string): Promise<ProductDetails> {
  const result: ProductDetails = { sizes: [] };

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

    // Extract sizes from data-size attributes on input elements
    // Pattern: <input ... class="fnc-product-cart-size" ... data-size="36-37">
    const sizeRegex = /<input[^>]+class="fnc-product-cart-size[^"]*"[^>]+data-size="([^"]+)"/g;
    let match;
    const seenSizes = new Set<string>();

    while ((match = sizeRegex.exec(html)) !== null) {
      const size = match[1].trim();
      // Filter: must be alphanumeric with optional dash/slash (e.g., "42", "36-37", "XL", "S/M")
      if (size && !seenSizes.has(size) && /^[\dA-Za-z][\dA-Za-z\-\/]*$/.test(size)) {
        seenSizes.add(size);
        result.sizes.push(size);
      }
    }

    // Alternative pattern: data-size before class
    if (result.sizes.length === 0) {
      const altSizeRegex = /<input[^>]+data-size="([^"]+)"[^>]+class="fnc-product-cart-size/g;
      while ((match = altSizeRegex.exec(html)) !== null) {
        const size = match[1].trim();
        if (size && !seenSizes.has(size) && /^[\dA-Za-z][\dA-Za-z\-\/]*$/.test(size)) {
          seenSizes.add(size);
          result.sizes.push(size);
        }
      }
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch: ${message}`);
  }

  return result;
}

async function scrapeNSportDetails(): Promise<void> {
  console.log("Starting N-Sport detail scraper (fast HTTP mode)...");

  const deals = await getDealsWithoutDetails(STORE);
  console.log(`Found ${deals.length} deals without details`);

  if (deals.length === 0) {
    console.log("No deals to process");
    await disconnect();
    return;
  }

  let processed = 0;
  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  for (const deal of deals) {
    const progress = `[${processed + 1}/${deals.length}]`;

    try {
      const details = await fetchProductDetails(deal.url);

      // Extract category and gender from product name
      const cat = mapCategory(deal.name);
      const gender = mapGender(deal.name);

      if (details.sizes.length > 0 || cat || gender) {
        await updateDealDetails(deal.url, {
          ...(details.sizes.length > 0 && { sizes: details.sizes }),
          ...(cat && { categories: [cat] }),
          ...(gender && { gender }),
        });
        updated++;
        console.log(`${progress} ✓ ${deal.name.substring(0, 40)}... | sizes: ${details.sizes.join(", ") || "none"} | cat: ${cat || "none"} | gender: ${gender || "unknown"}`);
      } else {
        console.log(`${progress} - ${deal.name.substring(0, 40)}... | no sizes found`);
      }

      processed++;

      // Polite delay: 500-1000ms between requests
      await sleep(500 + Math.random() * 500);

    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ✗ ${deal.name.substring(0, 40)}... | ${message}`);

      // Longer delay after error
      await sleep(2000);
    }

    // Progress report every 100 products
    if (processed % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (deals.length - processed) / rate;
      console.log(`\n--- Progress: ${processed}/${deals.length} | Rate: ${rate.toFixed(1)}/sec | ETA: ${(remaining / 60).toFixed(1)} min ---\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log("\n=== Detail Scraping Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Updated with sizes: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`Average rate: ${(processed / totalTime).toFixed(2)} products/second`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('nsport-details.ts')) {
  scrapeNSportDetails().catch(console.error);
}

export { scrapeNSportDetails };
