"use client";

import { Deal } from "@/types/deal";
import { useWishlistContext } from "@/context/wishlist-context";
import { Tooltip } from "@/components/ui/tooltip";

interface WishlistButtonProps {
  deal: Deal;
  size?: "sm" | "md";
  className?: string;
}

export function WishlistButton({ deal, size = "sm", className = "" }: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist, isLoaded } = useWishlistContext();

  if (!isLoaded) {
    return null;
  }

  const inWishlist = isInWishlist(deal.id);
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  const tooltipText = inWishlist ? "Ukloni iz omiljenih" : "Dodaj u omiljene";

  return (
    <Tooltip content={tooltipText}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(deal);
        }}
        className={`${padding} rounded-full bg-white/90 hover:bg-white shadow-sm transition-all cursor-pointer ${className}`}
        aria-label={tooltipText}
      >
        {inWishlist ? (
          <svg
            className={`${iconSize} text-red-500`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            className={`${iconSize} text-gray-600 hover:text-red-500`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
      </button>
    </Tooltip>
  );
}
