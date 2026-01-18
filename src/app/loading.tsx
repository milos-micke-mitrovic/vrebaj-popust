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
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="relative h-[400px] sm:h-[500px] bg-gray-300 dark:bg-gray-800 animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="h-12 w-64 rounded bg-gray-400 dark:bg-gray-700 animate-pulse mb-4" />
          <div className="h-6 w-96 rounded bg-gray-400 dark:bg-gray-700 animate-pulse mb-8" />
          <div className="h-14 w-48 rounded-lg bg-gray-400 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-10 w-20 mx-auto rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
                <div className="h-4 w-24 mx-auto rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
