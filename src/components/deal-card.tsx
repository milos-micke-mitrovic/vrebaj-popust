"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal, Store } from "@/types/deal";
import { formatPrice } from "@/lib/utils";

interface DealCardProps {
  deal: Deal;
}

const STORE_INFO: Record<Store, { name: string; logo: string; fallbackColor: string }> = {
  djaksport: { name: "Djak Sport", logo: "/logos/djaksport.png", fallbackColor: "bg-red-600" },
  planeta: { name: "Planeta Sport", logo: "/logos/planeta.png", fallbackColor: "bg-blue-600" },
  fashionandfriends: { name: "F&F", logo: "/logos/ff.png", fallbackColor: "bg-black" },
};

export function DealCard({ deal }: DealCardProps) {
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const storeInfo = STORE_INFO[deal.store];

  return (
    <Link href={`/deal/${deal.id}`}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {deal.imageUrl && !imgError ? (
            <img
              src={deal.imageUrl}
              alt={deal.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-xs text-center p-2">
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
              <img
                src={storeInfo.logo}
                alt={storeInfo.name}
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
        </div>
        <CardContent className="p-3">
          {deal.brand && (
            <p className="text-xs font-medium text-gray-500 uppercase">
              {deal.brand}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-sm font-medium">{deal.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-red-600">
              {formatPrice(deal.salePrice)}
            </span>
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(deal.originalPrice)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ušteda: {formatPrice(deal.originalPrice - deal.salePrice)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
