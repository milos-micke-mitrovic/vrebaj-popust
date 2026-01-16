"use client";

interface ScrapeRun {
  id: string;
  store: string;
  totalScraped: number;
  filteredCount: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date | null;
}

interface DashboardProps {
  scrapeRuns: ScrapeRun[];
  productCounts: Record<string, number>;
}

function formatDate(date: Date | null): string {
  if (!date) return "unknown";
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function timeAgo(date: Date | null): string {
  if (!date) return "unknown";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard({ scrapeRuns, productCounts }: DashboardProps) {
  const totalProducts = Object.values(productCounts).reduce((a, b) => a + b, 0);

  // Group runs by store for latest status
  const latestByStore: Record<string, ScrapeRun> = {};
  for (const run of scrapeRuns) {
    if (!latestByStore[run.store]) {
      latestByStore[run.store] = run;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scraper Admin</h1>

        {/* Product counts */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Current Products: {totalProducts}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(productCounts).map(([store, count]) => (
              <div key={store} className="bg-gray-700 rounded p-3 text-center">
                <div className="text-sm text-gray-400 capitalize">{store}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest status per store */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Latest Scrape Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(latestByStore).map(([store, run]) => (
              <div
                key={store}
                className={`rounded p-3 ${
                  run.errors.length > 0 ? "bg-red-900/50" : "bg-green-900/50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold capitalize">{store}</span>
                  <span className="text-sm text-gray-400">
                    {timeAgo(run.completedAt)}
                  </span>
                </div>
                <div className="text-sm mt-1">
                  Scraped: {run.totalScraped} | Deals: {run.filteredCount}
                </div>
                {run.errors.length > 0 && (
                  <div className="text-sm text-red-400 mt-1">
                    {run.errors.length} error(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent scrape runs with errors */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Recent Scrape Runs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">Store</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Scraped</th>
                  <th className="pb-2">Deals</th>
                  <th className="pb-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {scrapeRuns.map((run) => (
                  <tr
                    key={run.id}
                    className={`border-b border-gray-700/50 ${
                      run.errors.length > 0 ? "bg-red-900/20" : ""
                    }`}
                  >
                    <td className="py-2 capitalize">{run.store}</td>
                    <td className="py-2 text-gray-400">
                      {formatDate(run.completedAt)}
                    </td>
                    <td className="py-2">{run.totalScraped}</td>
                    <td className="py-2">{run.filteredCount}</td>
                    <td className="py-2">
                      {run.errors.length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-red-400">
                            {run.errors.length} error(s)
                          </summary>
                          <div className="mt-2 p-2 bg-gray-900 rounded text-xs font-mono whitespace-pre-wrap">
                            {run.errors.join("\n\n")}
                          </div>
                        </details>
                      ) : (
                        <span className="text-green-400">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Refresh page to see latest data. Auto-refreshes every 60 seconds on reload.</p>
          <p className="mt-2">
            SSH logs: <code className="bg-gray-800 px-1 rounded">tail -100 /var/log/vrebaj-scraper.log</code>
          </p>
        </div>
      </div>
    </div>
  );
}
