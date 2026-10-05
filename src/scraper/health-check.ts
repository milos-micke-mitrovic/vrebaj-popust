import "dotenv/config";
import type { Store } from "../types/deal";
import type { ScrapeRunSummary } from "../lib/ingest-types";
import { parseStringArray } from "../lib/json-array";

const INGEST_URL = process.env.INGEST_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;

// Reads recent scrape runs via the same authenticated /api/ingest endpoint the
// scrapers write through (D1 isn't reachable directly from GitHub Actions).
async function fetchRecentRuns(sinceHours: number): Promise<ScrapeRunSummary[]> {
  if (!INGEST_URL || !INGEST_SECRET) {
    throw new Error("INGEST_URL / INGEST_SECRET are not set — health-check reads via /api/ingest.");
  }
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${INGEST_SECRET}` },
    body: JSON.stringify({ action: "getRecentScrapeRuns", sinceHours }),
  });
  if (!res.ok) throw new Error(`health-check fetch failed: HTTP ${res.status}`);
  const { runs } = (await res.json()) as { runs: ScrapeRunSummary[] };
  return runs;
}

const STORES: Store[] = [
  "djaksport",
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

// Self-expiring alert snooze for a KNOWN, acknowledged issue we're deliberately waiting
// out — stops the nightly failure email from repeating while we watch, without going
// blind. The store still appears in the report (marked SNOOZED); it just doesn't fail the
// job. The mute AUTO-LIFTS after `until`, so a forgotten snooze can't hide a real outage.
// (none currently) — e.g. planeta was snoozed here Sept 2026 during its CF block before
// being dropped entirely 2026-10.
const SNOOZED: Partial<Record<Store, { until: string; reason: string }>> = {};
const isSnoozed = (store: Store): boolean => {
  const s = SNOOZED[store];
  return !!s && new Date() < new Date(s.until);
};

interface Issue {
  store: Store;
  severity: "critical" | "warning";
  message: string;
}

async function main(): Promise<void> {
  const runs = await fetchRecentRuns(6);

  const latestByStore = new Map<Store, ScrapeRunSummary>();
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
    const snooze = isSnoozed(store) ? `  (SNOOZED until ${SNOOZED[store]!.until})` : "";
    console.log(`  ${store.padEnd(14)} ${status}${snooze}`);
  }
  console.log();

  if (issues.length === 0) {
    console.log("All scrapers healthy.\n");
    process.exit(0);
  }

  console.log("=== Issues ===\n");
  let critical = 0;
  for (const issue of issues) {
    const snoozed = isSnoozed(issue.store);
    const tag = snoozed ? " (SNOOZED — not failing)" : "";
    console.log(`  [${issue.severity.toUpperCase()}] ${issue.store}: ${issue.message}${tag}`);
    if (issue.severity === "critical" && !snoozed) critical++;
  }
  console.log();

  process.exit(critical > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
