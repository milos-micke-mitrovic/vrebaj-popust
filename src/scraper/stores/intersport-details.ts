import { getDealsWithoutDetails, updateDealDetails, disconnect } from "../db-writer";

const STORE = "intersport" as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProductDetails {
  sizes: string[];
  description: string | null;
}

async function fetchProductDetails(url: string): Promise<ProductDetails> {
  const result: ProductDetails = { sizes: [], description: null };

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
    // Pattern: <input ... class="fnc-product-cart-size" ... data-size="36">
    const sizeRegex = /data-size="([^"]+)"[^>]*class="fnc-product-cart-size|class="fnc-product-cart-size[^"]*"[^>]*data-size="([^"]+)"/g;
    let match;
    const seenSizes = new Set<string>();

    while ((match = sizeRegex.exec(html)) !== null) {
      const size = (match[1] || match[2])?.trim();
      // Filter: must be alphanumeric with optional dash/slash/dot (e.g., "42", "36-37", "XL", "S/M", "37.5")
      if (size && !seenSizes.has(size) && /^[\dA-Za-z][\dA-Za-z\-\/\.]*$/.test(size) && !size.includes('input')) {
        seenSizes.add(size);
        result.sizes.push(size);
      }
    }

    // Extract description from product declaration
    const descMatch = html.match(/<div[^>]*id="product-declaration"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/);
    if (descMatch) {
      result.description = descMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
        .substring(0, 500);
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch: ${message}`);
  }

  return result;
}

async function scrapeIntersportDetails(): Promise<void> {
  console.log("Starting Intersport detail scraper...");

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

      if (details.sizes.length > 0 || details.description) {
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          description: details.description,
        });
        updated++;
        console.log(`${progress} ✓ ${deal.name.substring(0, 40)}... | sizes: ${details.sizes.join(", ") || "none"}`);
      } else {
        console.log(`${progress} - ${deal.name.substring(0, 40)}... | no details found`);
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

    // Progress report every 50 products
    if (processed % 50 === 0) {
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
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`Average rate: ${(processed / totalTime).toFixed(2)} products/second`);

  await disconnect();
}

// Run if executed directly
if (process.argv[1]?.includes('intersport-details.ts')) {
  scrapeIntersportDetails().catch(console.error);
}

export { scrapeIntersportDetails };
