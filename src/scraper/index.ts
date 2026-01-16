import { scrapeDjakSport } from "./stores/djaksport";
import { scrapePlaneta } from "./stores/planeta";
import { scrapeNSport } from "./stores/nsport";
import { scrapeSportVision } from "./stores/sportvision";
import { scrapeBuzz } from "./stores/buzz";
import { scrapeOfficeShoes } from "./stores/officeshoes";
import { scrapeDjakSportDetails } from "./stores/djaksport-details";
import { scrapePlanetaDetails } from "./stores/planeta-details";
import { scrapeNSportDetails } from "./stores/nsport-details";
import { scrapeSportVisionDetails } from "./stores/sportvision-details";
import { scrapeBuzzDetails } from "./stores/buzz-details";
import { scrapeOfficeShoeDetails } from "./stores/officeshoes-details";

interface ScraperDef {
  name: string;
  fn: () => Promise<void>;
}

// Run a batch of scrapers in parallel using Promise.allSettled
// If one fails, others continue running
async function runBatch(scrapers: ScraperDef[]): Promise<{ succeeded: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    scrapers.map(async (scraper) => {
      console.log(`[START] ${scraper.name}`);
      await scraper.fn();
      return scraper.name;
    })
  );

  const succeeded: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    const name = scrapers[index].name;
    if (result.status === "fulfilled") {
      succeeded.push(name);
      console.log(`[DONE] ${name} completed successfully`);
    } else {
      failed.push(name);
      console.error(`[FAIL] ${name} failed:`, result.reason);
    }
  });

  return { succeeded, failed };
}

async function runAllScrapers(): Promise<void> {
  console.log("=== Starting All Scrapers (Parallel Batches) ===\n");
  console.log(`Started at: ${new Date().toISOString()}\n`);
  const startTime = Date.now();

  // === LIST SCRAPERS (find products) ===

  // Batch 1: DjakSport, Planeta, NSport
  const listBatch1: ScraperDef[] = [
    { name: "DjakSport", fn: scrapeDjakSport },
    { name: "Planeta Sport", fn: scrapePlaneta },
    { name: "N-Sport", fn: scrapeNSport },
  ];

  // Batch 2: SportVision, Buzz, OfficeShoes
  const listBatch2: ScraperDef[] = [
    { name: "SportVision", fn: scrapeSportVision },
    { name: "Buzz Sneakers", fn: scrapeBuzz },
    { name: "Office Shoes", fn: scrapeOfficeShoes },
  ];

  console.log("=== List Scrapers Batch 1: DjakSport, Planeta, NSport ===\n");
  const listResult1 = await runBatch(listBatch1);

  console.log("\n=== List Scrapers Batch 2: SportVision, Buzz, OfficeShoes ===\n");
  const listResult2 = await runBatch(listBatch2);

  // === DETAIL SCRAPERS (enrich products with sizes, categories, gender) ===

  // Batch 3: DjakSport, Planeta, NSport details
  const detailBatch1: ScraperDef[] = [
    { name: "DjakSport Details", fn: scrapeDjakSportDetails },
    { name: "Planeta Details", fn: scrapePlanetaDetails },
    { name: "N-Sport Details", fn: scrapeNSportDetails },
  ];

  // Batch 4: SportVision, Buzz, OfficeShoes details
  const detailBatch2: ScraperDef[] = [
    { name: "SportVision Details", fn: scrapeSportVisionDetails },
    { name: "Buzz Details", fn: scrapeBuzzDetails },
    { name: "OfficeShoes Details", fn: scrapeOfficeShoeDetails },
  ];

  console.log("\n=== Detail Scrapers Batch 1: DjakSport, Planeta, NSport ===\n");
  const detailResult1 = await runBatch(detailBatch1);

  console.log("\n=== Detail Scrapers Batch 2: SportVision, Buzz, OfficeShoes ===\n");
  const detailResult2 = await runBatch(detailBatch2);

  // === SUMMARY ===

  const allSucceeded = [
    ...listResult1.succeeded,
    ...listResult2.succeeded,
    ...detailResult1.succeeded,
    ...detailResult2.succeeded,
  ];
  const allFailed = [
    ...listResult1.failed,
    ...listResult2.failed,
    ...detailResult1.failed,
    ...detailResult2.failed,
  ];
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  console.log("\n=== All Scrapers Complete ===");
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log(`Total time: ${minutes}m ${seconds}s`);
  console.log(`Succeeded (${allSucceeded.length}): ${allSucceeded.join(", ") || "none"}`);
  console.log(`Failed (${allFailed.length}): ${allFailed.join(", ") || "none"}`);
}

// Run if called directly
runAllScrapers().catch(console.error);

export { runAllScrapers };
