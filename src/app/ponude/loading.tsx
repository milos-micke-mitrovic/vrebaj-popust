import { DealCardSkeleton } from "@/components/deal-card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 border-b bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Search bar skeleton */}
        <div className="mb-6">
          <div className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters skeleton - desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
                  <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Products grid skeleton */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-8 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
