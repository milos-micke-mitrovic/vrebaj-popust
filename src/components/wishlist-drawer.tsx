"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWishlistContext } from "@/context/wishlist-context";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";

function WishlistImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="80px"
      className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setLoaded(true)}
      unoptimized
    />
  );
}

interface WishlistDrawerProps {
  availableDealIds: Set<string>;
}

const ITEMS_PER_PAGE = 10;

export function WishlistDrawer({ availableDealIds }: WishlistDrawerProps) {
  const router = useRouter();
  const { wishlist, isLoaded, isDrawerOpen, closeDrawer, removeFromWishlist, clearWishlist } =
    useWishlistContext();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset visible count when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      setVisibleCount(ITEMS_PER_PAGE);
    }
  }, [isDrawerOpen]);

  const visibleItems = wishlist.slice(0, visibleCount);
  const hasMore = wishlist.length > visibleCount;

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl animate-[slideInRight_0.2s_ease-out] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold dark:text-white">Omiljene ponude ({wishlist.length})</h2>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              Učitavanje...
            </div>
          ) : wishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Nemate omiljenih ponuda</p>
              <button
                onClick={() => {
                  closeDrawer();
                  router.push("/ponude");
                }}
                className="text-red-500 hover:underline text-sm cursor-pointer"
              >
                Pregledaj ponude
              </button>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {visibleItems.map((deal) => {
                const isAvailable = availableDealIds.has(deal.id);

                return (
                  <div
                    key={deal.id}
                    className={`flex gap-3 p-3 ${!isAvailable ? "opacity-50" : ""}`}
                  >
                    {/* Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {deal.imageUrl ? (
                        <WishlistImage src={getProxiedImageUrl(deal.imageUrl)} alt={deal.name} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          Nema slike
                        </div>
                      )}
                      {/* Discount badge */}
                      {isAvailable && (
                        <div className="absolute left-0 top-1 bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white rounded-r">
                          -{deal.discountPercent}%
                        </div>
                      )}
                      {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Isteklo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col min-w-0">
                      {deal.brand && (
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {deal.brand}
                        </p>
                      )}
                      <h3 className="text-sm font-medium line-clamp-2 text-gray-900 dark:text-white">
                        {deal.name}
                      </h3>
                      <div className="mt-auto flex items-center gap-2">
                        <span className="font-bold text-red-600 dark:text-red-500">
                          {formatPrice(deal.salePrice)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                          {formatPrice(deal.originalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeFromWishlist(deal.id)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Ukloni"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {isAvailable && (
                        <Link
                          href={`/ponuda/${deal.id}`}
                          onClick={closeDrawer}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Pogledaj
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  className="w-full py-3 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                >
                  Prikaži još ({wishlist.length - visibleCount} preostalo)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer with clear all */}
        {wishlist.length > 0 && (
          <div className="border-t dark:border-gray-800 p-3">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-2 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              Obriši sve
            </button>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Obriši sve"
        message="Da li ste sigurni da želite da uklonite sve ponude iz liste omiljenih?"
        confirmText="Obriši"
        cancelText="Odustani"
        onConfirm={() => {
          clearWishlist();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
