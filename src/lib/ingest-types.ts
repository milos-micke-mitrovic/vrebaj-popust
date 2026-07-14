// Shared wire types for the scraper → /api/ingest write path. Imported by both the
// Node scraper client (src/scraper/db-writer.ts) and the Worker endpoint
// (src/lib/ingest-db.ts + src/app/api/ingest/route.ts). Keep this free of runtime
// deps (no Prisma, no getPrisma) so the scraper bundle stays lean.
import type { Store, Gender } from "../types/deal";

export interface DealInput {
  id: string;
  store: Store;
  name: string;
  brand: string | null;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  url: string;
  imageUrl: string | null;
  sizes?: string[];
  description?: string | null;
  detailImageUrl?: string | null;
  categories?: string[];
  gender?: Gender;
  // ISO-8601, stamped client-side so cleanupStaleProducts compares scrapedAt and
  // scrapeStartTime against the same (scraper) clock — avoids cross-clock skew.
  scrapedAt?: string;
}

export interface DealDetailsInput {
  sizes?: string[];
  description?: string | null;
  detailImageUrl?: string | null;
  categories?: string[];
  gender?: Gender;
}

/** A deal that still needs detail scraping (returned by getDealsForDetailScraping). */
export interface DealToDetail {
  id: string;
  url: string;
  name: string;
}

/** One scrape run row, as returned to the health-check (errors is JSON-array TEXT). */
export interface ScrapeRunSummary {
  store: string;
  filteredCount: number;
  errors: string;
  startedAt: string;
}
