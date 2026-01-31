import { scrapeDjakSport } from "./stores/djaksport";
import { scrapePlaneta } from "./stores/planeta";
import { scrapeNSport } from "./stores/nsport";
import { scrapeSportVision } from "./stores/sportvision";
import { scrapeBuzz } from "./stores/buzz";
import { scrapeOfficeShoes } from "./stores/officeshoes";
import { scrapeIntersport } from "./stores/intersport";
import { scrapePlanetaDetails } from "./stores/planeta-details";
import { scrapeNSportDetails } from "./stores/nsport-details";
import { scrapeSportVisionDetails } from "./stores/sportvision-details";
import { scrapeBuzzDetails } from "./stores/buzz-details";
import { scrapeOfficeShoeDetails } from "./stores/officeshoes-details";
import { scrapeTrefSport } from "./stores/trefsport";
import { scrapeTrefSportDetails } from "./stores/trefsport-details";

interface ScraperDef {
  name: string;
  fn: () => Promise<void>;
}

// Run scrapers one by one sequentially
async function runSequential(scrapers: ScraperDef[]): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const scraper of scrapers) {
    console.log(`\n[START] ${scraper.name}`);
    try {
      await scraper.fn();
      succeeded.push(scraper.name);
      console.log(`[DONE] ${scraper.name} completed successfully`);
    } catch (err) {
      failed.push(scraper.name);
      console.error(`[FAIL] ${scraper.name} failed:`, err);
    }
  }

  return { succeeded, failed };
}

async function runAllScrapers(): Promise<void> {
  console.log("=== Starting All Scrapers (Sequential) ===\n");
  console.log(`Started at: ${new Date().toISOString()}\n`);
  const startTime = Date.now();

  // === LIST SCRAPERS (find products) ===
  // Planeta first (most reliable), DjakSport last (has timeout issues)
  const listScrapers: ScraperDef[] = [
    { name: "Planeta Sport", fn: scrapePlaneta },
    { name: "N-Sport", fn: scrapeNSport },
    { name: "SportVision", fn: scrapeSportVision },
    { name: "Buzz Sneakers", fn: scrapeBuzz },
    { name: "Office Shoes", fn: scrapeOfficeShoes },
    { name: "Intersport", fn: scrapeIntersport },
    { name: "Tref Sport", fn: scrapeTrefSport },
    { name: "DjakSport", fn: scrapeDjakSport },
  ];

  console.log("=== List Scrapers (one by one) ===");
  const listResult = await runSequential(listScrapers);

  // === DETAIL SCRAPERS (enrich products with sizes, categories, gender) ===
  // Note: DjakSport doesn't need detail scraper - gets all data from list API
  const detailScrapers: ScraperDef[] = [
    { name: "Planeta Details", fn: scrapePlanetaDetails },
    { name: "N-Sport Details", fn: scrapeNSportDetails },
    { name: "SportVision Details", fn: scrapeSportVisionDetails },
    { name: "Buzz Details", fn: scrapeBuzzDetails },
    { name: "OfficeShoes Details", fn: scrapeOfficeShoeDetails },
    { name: "Tref Sport Details", fn: scrapeTrefSportDetails },
  ];

  console.log("\n=== Detail Scrapers (one by one) ===");
  const detailResult = await runSequential(detailScrapers);

  // === SUMMARY ===
  const allSucceeded = [...listResult.succeeded, ...detailResult.succeeded];
  const allFailed = [...listResult.failed, ...detailResult.failed];
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
