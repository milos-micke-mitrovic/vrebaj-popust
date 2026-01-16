import { scrapeDjakSport } from "./stores/djaksport";
import { scrapePlaneta } from "./stores/planeta";
import { scrapeNSport } from "./stores/nsport";
import { scrapeSportVision } from "./stores/sportvision";
import { scrapeBuzz } from "./stores/buzz";
import { scrapeOfficeShoes } from "./stores/officeshoes";

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
  const startTime = Date.now();

  // Batch 1: DjakSport, Planeta, NSport
  const batch1: ScraperDef[] = [
    { name: "DjakSport", fn: scrapeDjakSport },
    { name: "Planeta Sport", fn: scrapePlaneta },
    { name: "N-Sport", fn: scrapeNSport },
  ];

  // Batch 2: SportVision, Buzz, OfficeShoes
  const batch2: ScraperDef[] = [
    { name: "SportVision", fn: scrapeSportVision },
    { name: "Buzz Sneakers", fn: scrapeBuzz },
    { name: "Office Shoes", fn: scrapeOfficeShoes },
  ];

  console.log("=== Running Batch 1: DjakSport, Planeta, NSport ===\n");
  const result1 = await runBatch(batch1);

  console.log("\n=== Running Batch 2: SportVision, Buzz, OfficeShoes ===\n");
  const result2 = await runBatch(batch2);

  const totalSucceeded = [...result1.succeeded, ...result2.succeeded];
  const totalFailed = [...result1.failed, ...result2.failed];
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log("\n=== All Scrapers Complete ===");
  console.log(`Time: ${elapsed} seconds`);
  console.log(`Succeeded (${totalSucceeded.length}): ${totalSucceeded.join(", ") || "none"}`);
  console.log(`Failed (${totalFailed.length}): ${totalFailed.join(", ") || "none"}`);
}

// Run if called directly
runAllScrapers().catch(console.error);

export { runAllScrapers };
