import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollToTop } from "@/components/scroll-to-top";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className || ""}`} />
  );
}

export default function ProductLoading() {
  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />

      {/* Breadcrumb skeleton */}
      <div className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <Skeleton className="h-4 w-20" />
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Product Details skeleton */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image skeleton */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
            <Skeleton className="h-full w-full rounded-none" />
          </div>

          {/* Info skeleton */}
          <div className="flex flex-col">
            {/* Store logo */}
            <div className="mb-4">
              <Skeleton className="h-8 w-24" />
            </div>

            {/* Brand */}
            <Skeleton className="h-4 w-20" />

            {/* Title */}
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-3/4" />

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>

            {/* Sizes */}
            <div className="mt-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-10" />
                ))}
              </div>
            </div>

            {/* Prices */}
            <div className="mt-6 rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
              <div className="flex items-baseline gap-4">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="mt-2 h-5 w-40" />
            </div>

            {/* CTA Button */}
            <div className="mt-6">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="mt-2 h-4 w-48 mx-auto" />
            </div>

            {/* Share and wishlist buttons */}
            <div className="mt-6 flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* SEO Content skeleton */}
        <div className="mt-12 rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </div>

        {/* Related products skeleton */}
        <div className="mt-12">
          <Skeleton className="h-7 w-48 mb-6" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white dark:bg-gray-800 shadow overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                  <div className="mt-2 flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      </div>
    </>
  );
}
