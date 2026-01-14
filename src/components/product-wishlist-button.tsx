"use client";

import { Deal } from "@/types/deal";
import { useWishlistContext } from "@/context/wishlist-context";

interface ProductWishlistButtonProps {
  deal: Deal;
}

export function ProductWishlistButton({ deal }: ProductWishlistButtonProps) {
  const { isInWishlist, toggleWishlist, isLoaded } = useWishlistContext();

  if (!isLoaded) {
    return null;
  }

  const inWishlist = isInWishlist(deal.id);

  return (
    <button
      onClick={() => toggleWishlist(deal)}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
        inWishlist
          ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
          : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      {inWishlist ? (
        <>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>Sačuvano</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>Sačuvaj</span>
        </>
      )}
    </button>
  );
}
