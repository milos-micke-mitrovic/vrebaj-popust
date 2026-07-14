import "dotenv/config";
import type { Store, Gender } from "../types/deal";
import type { DealInput, DealDetailsInput, DealToDetail } from "../lib/ingest-types";

// The scrapers write to Cloudflare D1 through the authenticated /api/ingest endpoint
// (GitHub Actions can't reach D1 directly). This module keeps the old db-writer API
// so the store scrapers are unchanged — it just POSTs instead of calling Prisma.
//
// Deals are buffered and flushed in batches (per-deal HTTP round-trips would be far
// too slow for ~thousands of products). The server upserts each deal in its own
// try/catch, so one bad product still can't abort a run; per-deal failures come back
// and are folded into the errors logged by logScrapeRun.

const INGEST_URL = process.env.INGEST_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;

const CHUNK = 50;
let buffer: DealInput[] = [];
let writeErrors: string[] = [];

async function callIngest(action: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!INGEST_URL || !INGEST_SECRET) {
    throw new Error(
      "INGEST_URL / INGEST_SECRET are not set — scrapers write via the Cloudflare /api/ingest endpoint. Set both env vars (point at a deployed Worker or a local `cf:preview`)."
    );
  }
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INGEST_SECRET}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ingest "${action}" failed: HTTP ${res.status} ${detail}`.trim());
  }
  return res.json();
}

// Flush buffered deals to D1 in chunks. Records per-deal and per-chunk failures into
// writeErrors (surfaced later via logScrapeRun) rather than throwing.
async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    try {
      const { failed } = (await callIngest("upsertDeals", { deals: chunk })) as {
        ok: number;
        failed: { url: string; error: string }[];
      };
      for (const f of failed || []) writeErrors.push(`upsert ${f.url}: ${f.error}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const d of chunk) writeErrors.push(`upsert ${d.url}: ${message}`);
      console.error(message);
    }
  }
}

export async function upsertDeal(deal: DealInput): Promise<void> {
  // Stamp scrapedAt on the scraper's clock so cleanupStaleProducts stays consistent.
  buffer.push({ ...deal, scrapedAt: deal.scrapedAt || new Date().toISOString() });
  if (buffer.length >= CHUNK) await flush();
}

export async function upsertDeals(deals: DealInput[]): Promise<number> {
  for (const deal of deals) {
    buffer.push({ ...deal, scrapedAt: deal.scrapedAt || new Date().toISOString() });
  }
  await flush();
  return deals.length;
}

export async function logScrapeRun(
  store: Store,
  totalScraped: number,
  filteredCount: number,
  errors: string[]
): Promise<void> {
  await flush();
  const allErrors = [...errors, ...writeErrors];
  writeErrors = [];
  await callIngest("logScrapeRun", { store, totalScraped, filteredCount, errors: allErrors });
}

export async function updateDealDetails(url: string, details: DealDetailsInput): Promise<void> {
  await callIngest("updateDealDetails", { url, details });
}

export async function getDealsForDetailScraping(
  store: Store,
  staleDays = 7
): Promise<DealToDetail[]> {
  const { deals } = (await callIngest("getDealsForDetailScraping", { store, staleDays })) as {
    deals: DealToDetail[];
  };
  return deals;
}

export async function cleanupStaleProducts(
  store: Store,
  scrapeStartTime: Date,
  productsFound: number
): Promise<number> {
  await flush();
  const { deleted } = (await callIngest("cleanupStaleProducts", {
    store,
    scrapeStartTime: scrapeStartTime.toISOString(),
    productsFound,
  })) as { deleted: number };
  return deleted;
}

export async function deleteDealByUrl(url: string): Promise<boolean> {
  try {
    const { deleted } = (await callIngest("deleteDealByUrl", { url })) as { deleted: boolean };
    return Boolean(deleted);
  } catch {
    return false;
  }
}

// No persistent connection to close now — just flush any buffered deals.
export async function disconnect(): Promise<void> {
  await flush();
}

export type { Store, Gender };
