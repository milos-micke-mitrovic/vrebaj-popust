"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Deal, Store } from "@/types/deal";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useDragScroll } from "@/hooks/use-drag-scroll";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function isNewDeal(createdAt: Date | string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < TWENTY_FOUR_HOURS;
}

interface TopDealsCarouselProps {
  deals: Deal[];
}

const STORE_INFO: Record<Store, { name: string; logo: string; fallbackColor: string }> = {
  djaksport: { name: "Djak Sport", logo: "/logos/djaksport.png", fallbackColor: "bg-red-600" },
  planeta: { name: "Planeta Sport", logo: "/logos/planeta.png", fallbackColor: "bg-blue-600" },
  sportvision: { name: "Sport Vision", logo: "/logos/sportvision.png", fallbackColor: "bg-orange-600" },
  nsport: { name: "N Sport", logo: "/logos/nsport.jpg", fallbackColor: "bg-green-600" },
  buzz: { name: "Buzz", logo: "/logos/buzz.png", fallbackColor: "bg-yellow-500" },
  officeshoes: { name: "Office Shoes", logo: "/logos/officeshoes.png", fallbackColor: "bg-purple-600" },
  intersport: { name: "Intersport", logo: "/logos/intersport.jpg", fallbackColor: "bg-blue-700" },
  trefsport: { name: "Tref Sport", logo: "/logos/trefsport.png", fallbackColor: "bg-teal-600" },
};

function CarouselCard({ deal, shouldPreventClick }: { deal: Deal; shouldPreventClick: () => boolean }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const storeInfo = STORE_INFO[deal.store];

  const handleClick = (e: React.MouseEvent) => {
    if (shouldPreventClick()) {
      e.preventDefault();
      return;
    }
    sessionStorage.setItem("dealsReturnUrl", "/#top-deals");
  };

  return (
    <Link
      href={`/ponuda/${deal.id}`}
      className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px]"
      draggable={false}
      onClick={handleClick}
    >
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg dark:bg-gray-800 dark:border-gray-700 !p-0 card-glow">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          <Image
            src={!imgError ? getProxiedImageUrl(deal.imageUrl) : "/images/placeholder.png"}
            alt={deal.name}
            fill
            sizes="220px"
            className={`object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            unoptimized
            draggable={false}
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
                className="h-5 w-auto rounded bg-white/90 p-0.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className={`${storeInfo.fallbackColor} rounded px-2 py-0.5 text-[10px] font-bold text-white`}>
                {storeInfo.name}
              </div>
            )}
          </div>
          {/* Wishlist button */}
          <div
            className="absolute right-2 bottom-2"
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <WishlistButton deal={deal} size="sm" />
          </div>
          {/* New badge */}
          {isNewDeal(deal.createdAt) && (
            <div className="absolute left-2 bottom-2.5">
              <Tooltip content="Dodato u poslednjih 24h">
                <div className="rounded bg-green-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm cursor-help">
                  SVEŽE
                </div>
              </Tooltip>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          {deal.brand && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {deal.brand}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-sm font-medium dark:text-white">{deal.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-red-600 dark:text-red-500">
              {formatPrice(deal.salePrice)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
              {formatPrice(deal.originalPrice)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TopDealsCarousel({ deals }: TopDealsCarouselProps) {
  const { containerRef, shouldPreventClick } = useDragScroll({ speed: 0.7 });

  // Duplicate deals for infinite scroll
  const duplicatedDeals = [...deals, ...deals];

  if (deals.length === 0) return null;

  return (
    <section id="top-deals" className="py-12 bg-gray-50 dark:bg-gray-900 overflow-hidden scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Najveći popusti danas
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Top 10 proizvoda sa najvećim popustima
          </p>
        </div>
      </div>

      {/* Carousel container */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-scroll scrollbar-hide select-none"
        >
          {duplicatedDeals.map((deal, index) => (
            <CarouselCard key={`${deal.id}-${index}`} deal={deal} shouldPreventClick={shouldPreventClick} />
          ))}
        </div>
      </div>

      {/* View all link */}
      <div className="mt-6 text-center px-4">
        <Link
          href="/ponude?sortBy=discount"
          className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
        >
          Vidi sve ponude
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
