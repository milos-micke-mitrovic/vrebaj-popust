"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal, Store } from "@/types/deal";
import { formatPrice } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";

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

export function DealCard({ deal }: DealCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const storeInfo = STORE_INFO[deal.store];
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Save current URL with filters when clicking a product
  const handleClick = () => {
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    sessionStorage.setItem("dealsReturnUrl", currentUrl);
  };

  return (
    <Link href={`/ponuda/${deal.id}`} onClick={handleClick}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          {deal.imageUrl && !imgError ? (
            <Image
              src={deal.imageUrl}
              alt={deal.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500 text-xs text-center p-2">
              {deal.brand || "Nema slike"}
            </div>
          )}
          {/* Discount badge */}
          <Badge className="absolute left-2 top-2 bg-red-500 text-white hover:bg-red-600">
            -{deal.discountPercent}%
          </Badge>
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
              <div
                className={`${storeInfo.fallbackColor} rounded px-2 py-0.5 text-[10px] font-bold text-white`}
              >
                {storeInfo.name}
              </div>
            )}
          </div>
          {/* Wishlist button */}
          <div className="absolute right-2 bottom-2">
            <WishlistButton deal={deal} size="sm" />
          </div>
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ušteda: {formatPrice(deal.originalPrice - deal.salePrice)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
