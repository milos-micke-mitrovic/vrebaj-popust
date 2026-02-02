import { JSDOM } from "jsdom";
import { getDealsForDetailScraping, updateDealDetails, deleteDealByUrl, disconnect } from "../db-writer";
import { mapCategory } from "../../lib/category-mapper";
import { mapGender } from "../../lib/gender-mapper";

const STORE = "intersport" as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProductDetails {
  sizes: string[];
  description: string | null;
  categories: string[];
}

async function fetchProductDetails(url: string, productName: string): Promise<ProductDetails> {
  const result: ProductDetails = { sizes: [], description: null, categories: [] };

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

    // Extract sizes from input elements with data-size attribute
    const sizeInputs = doc.querySelectorAll('input.fnc-product-cart-size[data-size]');
    const seenSizes = new Set<string>();
    for (const input of sizeInputs) {
      const size = input.getAttribute('data-size')?.trim();
      if (size && !seenSizes.has(size)) {
        seenSizes.add(size);
        result.sizes.push(size);
      }
    }

    // Fallback: try size-list li elements
    if (result.sizes.length === 0) {
      const sizeItems = doc.querySelectorAll('.size-list li, .size-values');
      for (const item of sizeItems) {
        const size = item.textContent?.trim();
        if (size && !seenSizes.has(size) && /^[\dA-Za-z][\dA-Za-z\-\/\.\s]*$/.test(size)) {
          seenSizes.add(size);
          result.sizes.push(size);
        }
      }
    }

    // Extract categories from breadcrumbs
    const breadcrumbs = doc.querySelectorAll('.breadcrumbs a, .breadcrumb a, nav a');
    for (const el of breadcrumbs) {
      const text = el.textContent?.trim() || "";
      const category = mapCategory(text);
      if (category && !result.categories.includes(category)) {
        result.categories.push(category);
      }
    }

    // Fallback: extract category from URL path
    if (result.categories.length === 0) {
      const urlLower = url.toLowerCase();
      if (urlLower.includes('/patike/') || urlLower.includes('-patike-')) result.categories.push('obuca/patike');
      else if (urlLower.includes('/cipele/') || urlLower.includes('-cipele-')) result.categories.push('obuca/cipele');
      else if (urlLower.includes('/cizme/') || urlLower.includes('-cizme-')) result.categories.push('obuca/cizme');
      else if (urlLower.includes('/papuce/') || urlLower.includes('-papuce-')) result.categories.push('obuca/papuce');
      else if (urlLower.includes('/sandale/') || urlLower.includes('-sandale-')) result.categories.push('obuca/sandale');
      else if (urlLower.includes('/kopacke/') || urlLower.includes('-kopacke-')) result.categories.push('obuca/kopacke');
      else if (urlLower.includes('/jakne/') || urlLower.includes('-jakna-') || urlLower.includes('-jakne-')) result.categories.push('odeca/jakne');
      else if (urlLower.includes('/duksevi/') || urlLower.includes('-duks-')) result.categories.push('odeca/duksevi');
      else if (urlLower.includes('/majice/') || urlLower.includes('-majica-')) result.categories.push('odeca/majice');
      else if (urlLower.includes('/pantalone/') || urlLower.includes('-pantalone-') || urlLower.includes('ski-pantalone')) result.categories.push('odeca/pantalone');
      else if (urlLower.includes('/trenerke/') || urlLower.includes('-trenerka-')) result.categories.push('odeca/trenerke');
      else if (urlLower.includes('/sortevi/') || urlLower.includes('-sorc-')) result.categories.push('odeca/sortevi');
      else if (urlLower.includes('/kupaci/') || urlLower.includes('-kupaci-')) result.categories.push('odeca/kupaci');
    }

    // Final fallback: extract category from product name
    if (result.categories.length === 0 && productName) {
      const category = mapCategory(productName);
      if (category) {
        result.categories.push(category);
      }
    }

    // Extract description from product declaration
    const descEl = doc.querySelector('#product-declaration p');
    if (descEl) {
      result.description = descEl.textContent?.trim().substring(0, 500) || null;
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch: ${message}`);
  }

  return result;
}

async function scrapeIntersportDetails(): Promise<void> {
  console.log("Starting Intersport detail scraper...");

  const deals = await getDealsForDetailScraping(STORE);
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

      // If no sizes found and product is footwear/clothing, delete it
      if (details.sizes.length === 0) {
        const cat = mapCategory(deal.name + " " + deal.url);
        if (cat && (cat.startsWith("obuca/") || cat.startsWith("odeca/"))) {
          await deleteDealByUrl(deal.url);
          deleted++;
          console.log(`${progress} ✗ ${deal.name.substring(0, 40)}... | no sizes - DELETED`);
        }
      } else {
        await updateDealDetails(deal.url, {
          sizes: details.sizes,
          description: details.description,
          ...(details.categories.length > 0 && { categories: details.categories }),
        });
        updated++;
        console.log(`${progress} ✓ ${deal.name.substring(0, 40)}... | sizes: ${details.sizes.join(", ")} | cat: ${details.categories.join(", ") || "none"}`);
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
  console.log(`Deleted (no sizes): ${deleted}`);
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
