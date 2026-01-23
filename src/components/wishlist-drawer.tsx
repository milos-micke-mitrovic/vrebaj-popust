"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWishlistContext } from "@/context/wishlist-context";
import { useRecentlyViewedContext } from "@/context/recently-viewed-context";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScrollFade } from "@/components/scroll-fade";
import { Deal } from "@/types/deal";

function DrawerImage({ src, alt }: { src: string; alt: string }) {
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

type TabType = "wishlist" | "recent";

const ITEMS_PER_PAGE = 10;

export function WishlistDrawer({ availableDealIds }: WishlistDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { wishlist, isLoaded: wishlistLoaded, isDrawerOpen, closeDrawer, removeFromWishlist, clearWishlist } =
    useWishlistContext();
  const { recentlyViewed, isLoaded: recentLoaded, clearRecentlyViewed } = useRecentlyViewedContext();
  const [activeTab, setActiveTab] = useState<TabType>("wishlist");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Filter recently viewed to only show available products
  const availableRecentlyViewed = recentlyViewed.filter((deal) => availableDealIds.has(deal.id));

  const isLoaded = activeTab === "wishlist" ? wishlistLoaded : recentLoaded;
  const currentItems = activeTab === "wishlist" ? wishlist : availableRecentlyViewed;
  const visibleItems = currentItems.slice(0, visibleCount);
  const hasMore = currentItems.length > visibleCount;

  // Reset pagination when drawer closes or tab changes
  const handleClose = () => {
    closeDrawer();
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Handle clicking on an item
  const handleItemClick = () => {
    const existingOrigin = sessionStorage.getItem("dealsReturnUrl");
    const isOnProductPage = pathname.startsWith("/ponuda/");

    if (!existingOrigin && !isOnProductPage) {
      sessionStorage.setItem("dealsReturnUrl", pathname);
    }

    handleClose();
  };

  const handleClear = () => {
    if (activeTab === "wishlist") {
      clearWishlist();
    } else {
      clearRecentlyViewed();
    }
    setShowClearConfirm(false);
  };

  if (!isDrawerOpen) return null;

  const renderItem = (deal: Deal, showRemove: boolean) => {
    const isAvailable = availableDealIds.has(deal.id);

    return (
      <div
        key={deal.id}
        className={`flex gap-3 p-3 ${!isAvailable ? "opacity-50" : ""}`}
      >
        {/* Image */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          {deal.imageUrl ? (
            <DrawerImage src={getProxiedImageUrl(deal.imageUrl)} alt={deal.name} />
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
          {showRemove && (
            <button
              onClick={() => removeFromWishlist(deal.id)}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              title="Ukloni"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {!showRemove && <div className="h-6" />}
          {isAvailable && (
            <Link
              href={`/ponuda/${deal.id}`}
              onClick={handleItemClick}
              className="text-xs text-red-500 hover:underline"
            >
              Pogledaj
            </Link>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === "wishlist") {
      return (
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
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Niste još pregledali nijedan proizvod</p>
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
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl animate-[slideInRight_0.2s_ease-out] flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b dark:border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold dark:text-white">
            {activeTab === "wishlist" ? "Omiljene ponude" : "Nedavno pregledano"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-800">
          <button
            onClick={() => handleTabChange("wishlist")}
            className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "wishlist"
                ? "text-red-500 border-b-2 border-red-500"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Lista želja ({wishlist.length})
          </button>
          <button
            onClick={() => handleTabChange("recent")}
            className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "recent"
                ? "text-red-500 border-b-2 border-red-500"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Nedavno ({availableRecentlyViewed.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <ScrollFade maxHeight="calc(100vh - 180px)" className="overscroll-contain">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                Učitavanje...
              </div>
            ) : currentItems.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {visibleItems.map((deal) => renderItem(deal, activeTab === "wishlist"))}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                    className="w-full py-3 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Prikaži još ({currentItems.length - visibleCount} preostalo)
                  </button>
                )}
              </div>
            )}
          </ScrollFade>
        </div>

        {/* Footer with clear all */}
        {currentItems.length > 0 && (
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
        message={
          activeTab === "wishlist"
            ? "Da li ste sigurni da želite da uklonite sve ponude iz liste omiljenih?"
            : "Da li ste sigurni da želite da obrišete istoriju pregledanih proizvoda?"
        }
        confirmText="Obriši"
        cancelText="Odustani"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
