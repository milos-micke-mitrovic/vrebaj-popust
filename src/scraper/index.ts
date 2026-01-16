import { scrapeDjakSport } from "./stores/djaksport";
import { scrapePlaneta } from "./stores/planeta";
import { scrapeNSport } from "./stores/nsport";
import { scrapeSportVision } from "./stores/sportvision";
import { scrapeBuzz } from "./stores/buzz";
import { scrapeOfficeShoes } from "./stores/officeshoes";

async function runAllScrapers(): Promise<void> {
  console.log("=== Starting All Scrapers ===\n");

  const scrapers = [
    { name: "DjakSport", fn: scrapeDjakSport },
    { name: "Planeta Sport", fn: scrapePlaneta },
    { name: "N-Sport", fn: scrapeNSport },
    { name: "SportVision", fn: scrapeSportVision },
    { name: "Buzz Sneakers", fn: scrapeBuzz },
    { name: "Office Shoes", fn: scrapeOfficeShoes },
  ];

  let succeeded = 0;
  let failed = 0;

  for (const scraper of scrapers) {
    console.log(`\n=== Running ${scraper.name} ===\n`);
    try {
      await scraper.fn();
      succeeded++;
      console.log(`\n${scraper.name} completed successfully`);
    } catch (err) {
      failed++;
      console.error(`${scraper.name} scraper failed:`, err);
    }
  }

  console.log("\n=== All Scrapers Complete ===");
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
}

// Run if called directly
runAllScrapers().catch(console.error);

export { runAllScrapers };
