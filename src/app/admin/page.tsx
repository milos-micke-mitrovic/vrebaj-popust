import { prisma } from "@/lib/db";
import { Metadata } from "next";
import { AdminContent } from "./admin-content";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Admin - Scraper Logs | Vrebaj Popust",
  robots: "noindex, nofollow",
};

// Revalidate every minute
export const revalidate = 60;

async function getScrapeRuns() {
  const runs = await prisma.scrapeRun.findMany({
    orderBy: { completedAt: "desc" },
    take: 100,
  });
  // Convert dates for client component
  return runs.map(run => ({
    ...run,
    completedAt: run.completedAt,
  }));
}

async function getProductCounts() {
  const counts = await prisma.deal.groupBy({
    by: ["store"],
    _count: { id: true },
  });
  return Object.fromEntries(counts.map((c) => [c.store, c._count.id]));
}

export default async function AdminPage() {
  const [scrapeRuns, productCounts] = await Promise.all([
    getScrapeRuns(),
    getProductCounts(),
  ]);

  return (
    <AdminContent>
      <Dashboard scrapeRuns={scrapeRuns} productCounts={productCounts} />
    </AdminContent>
  );
}
