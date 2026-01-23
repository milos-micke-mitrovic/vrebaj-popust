"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ProductBreadcrumbProps {
  items: BreadcrumbItem[];
}

// Use useSyncExternalStore to read sessionStorage without useEffect setState issues
function useHasOrigin(): boolean {
  return useSyncExternalStore(
    // Subscribe - sessionStorage doesn't have events, so we just return a no-op
    () => () => {},
    // getSnapshot - client
    () => !!sessionStorage.getItem("dealsReturnUrl"),
    // getServerSnapshot - server
    () => false
  );
}

export function ProductBreadcrumb({ items }: ProductBreadcrumbProps) {
  const router = useRouter();
  const hasOrigin = useHasOrigin();

  // Get return URL from sessionStorage for back navigation
  const handleBack = () => {
    const returnUrl = sessionStorage.getItem("dealsReturnUrl");
    if (returnUrl) {
      // Clear origin after navigation
      sessionStorage.removeItem("dealsReturnUrl");
      router.push(returnUrl);
    }
  };

  return (
    <nav className="sticky top-[57px] z-40 border-b bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-2 py-2 text-sm">
          {/* Back button - only show if user came from another page */}
          {hasOrigin && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Nazad</span>
              </button>
              <span className="text-gray-300 dark:text-gray-600 flex-none">|</span>
            </>
          )}
          {/* Breadcrumb items */}
          <ol className="flex items-center gap-1 min-w-0 flex-1">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const isFirst = index === 0;

              return (
                <li key={index} className={`flex items-center ${isLast ? 'min-w-0 flex-1' : 'flex-none'}`}>
                  {index > 0 && (
                    <svg
                      className="w-4 h-4 mx-0.5 sm:mx-1 text-gray-400 dark:text-gray-500 flex-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-xs sm:text-sm ${
                        isFirst
                          ? "font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`px-1.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm ${
                        isLast
                          ? "bg-red-50 text-red-600 font-medium dark:bg-red-900/30 dark:text-red-400 overflow-hidden text-ellipsis whitespace-nowrap block"
                          : "text-gray-500 dark:text-gray-400 whitespace-nowrap"
                      }`}
                      title={isLast ? item.label : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
