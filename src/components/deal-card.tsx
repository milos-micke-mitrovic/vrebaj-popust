"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Deal, Store } from "@/types/deal";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useQuickView } from "@/context/quick-view-context";
import { useRecentlyViewedContext } from "@/context/recently-viewed-context";
import { Eye } from "lucide-react";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function isNewDeal(createdAt: Date | string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < TWENTY_FOUR_HOURS;
}

interface DealCardProps {
  deal: Deal;
}

const STORE_INFO: Record<Store, { name: string; logo: string; fallbackColor: string }> = {
  djaksport: { name: "Djak Sport", logo: "/logos/djaksport.png", fallbackColor: "bg-red-600" },
  planeta: { name: "Planeta Sport", logo: "/logos/planeta.png", fallbackColor: "bg-blue-600" },
  sportvision: { name: "Sport Vision", logo: "/logos/sportvision.png", fallbackColor: "bg-orange-600" },
  nsport: { name: "N Sport", logo: "/logos/nsport.jpg", fallbackColor: "bg-green-600" },
  buzz: { name: "Buzz", logo: "/logos/buzz.png", fallbackColor: "bg-yellow-500" },
  officeshoes: { name: "Office Shoes", logo: "/logos/officeshoes.png", fallbackColor: "bg-purple-600" },
};

export function DealCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden dark:bg-gray-800 dark:border-gray-700 !p-0">
      <div className="relative aspect-square overflow-hidden bg-gray-200 dark:bg-gray-700 animate-pulse">
        {/* Discount badge skeleton */}
        <div className="absolute left-2 top-2 h-5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        {/* Store logo skeleton */}
        <div className="absolute right-2 top-2 h-5 w-14 rounded bg-gray-300 dark:bg-gray-600" />
      </div>
      <CardContent className="p-3 space-y-2">
        {/* Brand skeleton */}
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        {/* Name skeleton - 2 lines */}
        <div className="space-y-1">
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        {/* Price skeleton */}
        <div className="flex items-baseline gap-2 pt-1">
          <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        {/* Savings skeleton */}
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function DealCard({ deal }: DealCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const storeInfo = STORE_INFO[deal.store];
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openQuickView } = useQuickView();
  const { addToRecentlyViewed } = useRecentlyViewedContext();

  // Save current URL with filters and scroll position when clicking a product
  // Only save when on /ponude pages, not on product detail pages
  const handleClick = () => {
    if (pathname.startsWith("/ponude")) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      sessionStorage.setItem("dealsReturnUrl", currentUrl);
      sessionStorage.setItem("dealsScrollPosition", String(window.scrollY));
      sessionStorage.setItem("dealsClickedProductId", deal.id);
    }
  };

  return (
    <Link href={`/ponuda/${deal.id}`} onClick={handleClick} scroll={true}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg dark:bg-gray-800 dark:border-gray-700 !p-0 card-glow">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          {/* Pulsing placeholder while loading */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          )}
          <Image
            src={!imgError ? getProxiedImageUrl(deal.imageUrl) : "/images/placeholder.png"}
            alt={deal.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            unoptimized
          />
          {/* Discount ribbon */}
          <div className="absolute -left-8 top-2 rotate-[-45deg] bg-gradient-to-r from-red-500 to-red-600 px-8 py-0.5 text-xs font-bold text-white shadow-md ribbon-shimmer">
            -{deal.discountPercent}%
          </div>
          {/* Store logo */}
          <div className="absolute right-2 top-2">
            {!logoError ? (
              <Image
                src={storeInfo.logo}
                alt={storeInfo.name}
                width={60}
                height={20}
                className="h-5 w-auto rounded bg-white/95 p-0.5 shadow-sm ring-1 ring-black/5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                className={`${storeInfo.fallbackColor} rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm`}
              >
                {storeInfo.name}
              </div>
            )}
          </div>
          {/* Bottom right buttons - appear on hover (desktop) */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            {/* Quick view button */}
            <Tooltip content="Brzi pregled">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToRecentlyViewed(deal);
                  openQuickView(deal);
                }}
                className="p-1.5 rounded-full bg-white/90 shadow-lg hover:bg-white transition-all cursor-pointer"
              >
                <Eye className="w-5 h-5 text-gray-600" />
              </button>
            </Tooltip>
            {/* Wishlist button */}
            <WishlistButton deal={deal} size="sm" />
          </div>
          {/* New badge */}
          {isNewDeal(deal.createdAt) && (
            <div className="absolute left-2 bottom-2">
              <span className="inline-flex items-center gap-1 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Novo
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          {deal.brand && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase truncate">
              {deal.brand}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-sm font-medium dark:text-white">{deal.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-base sm:text-lg font-bold text-red-600 dark:text-red-500">
              {formatPrice(deal.salePrice)}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 line-through">
              {formatPrice(deal.originalPrice)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ušteda: {formatPrice(deal.originalPrice - deal.salePrice)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
