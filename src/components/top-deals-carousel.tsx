"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Deal, Store } from "@/types/deal";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";
import { Tooltip } from "@/components/ui/tooltip";

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
};

function CarouselCard({ deal }: { deal: Deal }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const storeInfo = STORE_INFO[deal.store];

  const handleClick = () => {
    // Set origin as home page with anchor to scroll to carousel
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
            <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
              {formatPrice(deal.originalPrice)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TopDealsCarousel({ deals }: TopDealsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const hasDragged = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Duplicate deals for seamless infinite scroll
  const duplicatedDeals = [...deals, ...deals];

  // Auto-scroll animation
  useEffect(() => {
    const animate = () => {
      if (scrollRef.current && !isPaused && !isDragging) {
        scrollRef.current.scrollLeft += 0.5; // Slow smooth scroll

        // Reset to start when we've scrolled halfway (first set of items)
        const halfWidth = scrollRef.current.scrollWidth / 2;
        if (scrollRef.current.scrollLeft >= halfWidth) {
          scrollRef.current.scrollLeft = 0;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, isDragging]);

  // Prevent click if user dragged
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartX.current;
    // Mark as dragged if moved more than 5px
    if (Math.abs(dx) > 5) {
      hasDragged.current = true;
    }
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click prevention
    setTimeout(() => {
      hasDragged.current = false;
    }, 100);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.touches[0].clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.touches[0].clientX - dragStartX.current;
    // Mark as dragged if moved more than 5px
    if (Math.abs(dx) > 5) {
      hasDragged.current = true;
    }
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTimeout(() => {
      hasDragged.current = false;
    }, 100);
  };

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
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => { setIsPaused(false); setIsDragging(false); }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClickCapture={handleClickCapture}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Spacer for left padding */}
          <div className="flex-shrink-0 w-4 sm:w-8" />

          {duplicatedDeals.map((deal, index) => (
            <CarouselCard key={`${deal.id}-${index}`} deal={deal} />
          ))}

          {/* Spacer for right padding */}
          <div className="flex-shrink-0 w-4 sm:w-8" />
        </div>
      </div>

      {/* View all link */}
      <div className="mt-6 text-center px-4">
        <Link
          href="/ponude?sortBy=discount"
          className="inline-flex items-center text-red-500 hover:text-red-600 font-medium"
        >
          Vidi sve ponude
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
