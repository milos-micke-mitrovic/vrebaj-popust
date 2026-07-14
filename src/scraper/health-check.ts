import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { Store } from "../types/deal";
import { parseStringArray } from "../lib/json-array";

const prisma = new PrismaClient();

const STORES: Store[] = [
  "djaksport",
  "planeta",
  "sportvision",
  "nsport",
  "buzz",
  "officeshoes",
  "intersport",
  "trefsport",
];

// Any scraper producing fewer than this is considered broken.
// Set per-store overrides here if a store has a legitimately small catalog.
const MIN_HEALTHY_DEALS = 5;

interface Issue {
  store: Store;
  severity: "critical" | "warning";
  message: string;
}

async function main(): Promise<void> {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const runs = await prisma.scrapeRun.findMany({
    where: { startedAt: { gte: cutoff } },
    orderBy: { startedAt: "desc" },
  });

  const latestByStore = new Map<Store, (typeof runs)[number]>();
  for (const run of runs) {
    const store = run.store as Store;
    if (!latestByStore.has(store)) latestByStore.set(store, run);
  }

  const issues: Issue[] = [];

  for (const store of STORES) {
    const latest = latestByStore.get(store);
    if (!latest) {
      issues.push({
        store,
        severity: "critical",
        message: "No scrape run in last 6 hours",
      });
      continue;
    }
    if (latest.filteredCount < MIN_HEALTHY_DEALS) {
      issues.push({
        store,
        severity: "critical",
        message: `Only ${latest.filteredCount} deals (expected >= ${MIN_HEALTHY_DEALS})`,
      });
    }
    const latestErrors = parseStringArray(latest.errors);
    if (latestErrors.length > 0) {
      const preview = latestErrors.slice(0, 3).join("; ").slice(0, 300);
      issues.push({
        store,
        severity: "warning",
        message: `Errors: ${preview}`,
      });
    }
  }

  console.log("\n=== Scraper Health Report ===\n");
  for (const store of STORES) {
    const latest = latestByStore.get(store);
    const errCount = latest ? parseStringArray(latest.errors).length : 0;
    const status = latest
      ? `${latest.filteredCount} deals` +
        (errCount > 0 ? ` + ${errCount} errors` : "")
      : "NO RUN";
    console.log(`  ${store.padEnd(14)} ${status}`);
  }
  console.log();

  if (issues.length === 0) {
    console.log("All scrapers healthy.\n");
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log("=== Issues ===\n");
  let critical = 0;
  for (const issue of issues) {
    console.log(`  [${issue.severity.toUpperCase()}] ${issue.store}: ${issue.message}`);
    if (issue.severity === "critical") critical++;
  }
  console.log();

  await prisma.$disconnect();
  process.exit(critical > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
