"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ProductBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function ProductBreadcrumb({ items }: ProductBreadcrumbProps) {
  const router = useRouter();

  // Get return URL from sessionStorage for back navigation
  const handleBack = () => {
    const returnUrl = sessionStorage.getItem("dealsReturnUrl");
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push("/ponude");
    }
  };

  return (
    <>
      {/* Desktop/Tablet breadcrumb - styled like navigation */}
      <nav className="hidden sm:block sticky top-[57px] z-40 border-b bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <ol className="flex items-center gap-1 py-2 text-sm overflow-x-auto">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const isFirst = index === 0;

              return (
                <li key={index} className="flex items-center shrink-0">
                  {index > 0 && (
                    <svg
                      className="w-4 h-4 mx-1 text-gray-400 dark:text-gray-500"
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
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        isFirst
                          ? "font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`px-3 py-1.5 rounded-lg ${
                        isLast
                          ? "bg-red-50 text-red-600 font-medium dark:bg-red-900/30 dark:text-red-400 max-w-[300px] truncate"
                          : "text-gray-500 dark:text-gray-400"
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
      </nav>

      {/* Mobile breadcrumb - simplified back button + product name */}
      <nav className="sm:hidden sticky top-[57px] z-40 border-b bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
        <div className="px-4 py-2 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Nazad
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-sm text-red-600 dark:text-red-400 font-medium truncate">
            {items[items.length - 1]?.label}
          </span>
        </div>
      </nav>
    </>
  );
}
