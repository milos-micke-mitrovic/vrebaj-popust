import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/ingest-db";
import type { DealInput, DealDetailsInput } from "@/lib/ingest-types";

// Authenticated write/read endpoint for the scrapers. GitHub Actions can't reach D1
// directly, so the scrapers POST here (Bearer INGEST_SECRET) and this Worker route
// performs the D1 operations. See src/scraper/db-writer.ts for the client.

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return unauthorized();
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as string;

  try {
    switch (action) {
      case "upsertDeals":
        return NextResponse.json(await db.upsertDeals(body.deals as DealInput[]));
      case "updateDealDetails":
        await db.updateDealDetails(body.url as string, body.details as DealDetailsInput);
        return NextResponse.json({ ok: true });
      case "logScrapeRun":
        await db.logScrapeRun(
          body.store as Parameters<typeof db.logScrapeRun>[0],
          body.totalScraped as number,
          body.filteredCount as number,
          body.errors as string[]
        );
        return NextResponse.json({ ok: true });
      case "cleanupStaleProducts":
        return NextResponse.json({
          deleted: await db.cleanupStaleProducts(
            body.store as Parameters<typeof db.cleanupStaleProducts>[0],
            body.scrapeStartTime as string,
            body.productsFound as number
          ),
        });
      case "deleteDealByUrl":
        return NextResponse.json({ deleted: await db.deleteDealByUrl(body.url as string) });
      case "getDealsForDetailScraping":
        return NextResponse.json({
          deals: await db.getDealsForDetailScraping(
            body.store as Parameters<typeof db.getDealsForDetailScraping>[0],
            body.staleDays as number | undefined
          ),
        });
      case "getRecentScrapeRuns":
        return NextResponse.json({ runs: await db.getRecentScrapeRuns(body.sinceHours as number | undefined) });
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`[ingest] action "${action}" failed:`, err);
    return NextResponse.json({ error: "Ingest operation failed" }, { status: 500 });
  }
}
