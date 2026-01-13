import { scrapeDjakSport } from "./stores/djaksport";
import { ScrapeResult } from "@/types/deal";

async function runAllScrapers(): Promise<ScrapeResult[]> {
  console.log("=== Starting All Scrapers ===\n");

  const results: ScrapeResult[] = [];

  // DjakSport
  try {
    const djak = await scrapeDjakSport();
    results.push(djak);
  } catch (err) {
    console.error("DjakSport scraper failed:", err);
  }

  // Add more scrapers here:
  // const planeta = await scrapePlaneta({ headless: true });
  // results.push(planeta);

  console.log("\n=== All Scrapers Complete ===");
  console.log(`Total stores scraped: ${results.length}`);
  console.log(
    `Total deals found: ${results.reduce((sum, r) => sum + r.filteredCount, 0)}`
  );

  return results;
}

// Run if called directly
runAllScrapers().catch(console.error);

export { runAllScrapers };
