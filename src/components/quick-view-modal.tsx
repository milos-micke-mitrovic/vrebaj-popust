"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Deal, Store } from "@/types/deal";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";

const STORE_INFO: Record<Store, { name: string; logo: string; url: string }> = {
  djaksport: { name: "Djak Sport", logo: "/logos/djaksport.png", url: "https://www.djaksport.com" },
  planeta: { name: "Planeta Sport", logo: "/logos/planeta.png", url: "https://www.planetasport.rs" },
  sportvision: { name: "Sport Vision", logo: "/logos/sportvision.png", url: "https://www.sportvision.rs" },
  nsport: { name: "N Sport", logo: "/logos/nsport.jpg", url: "https://www.n-sport.rs" },
  buzz: { name: "Buzz", logo: "/logos/buzz.png", url: "https://www.buzzsneakers.rs" },
  officeshoes: { name: "Office Shoes", logo: "/logos/officeshoes.png", url: "https://www.officeshoes.rs" },
};

interface QuickViewModalProps {
  deal: Deal | null;
  onClose: () => void;
}

export function QuickViewModal({ deal, onClose }: QuickViewModalProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (deal) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [deal]);

  // Reset image loaded state when deal changes
  useEffect(() => {
    const resetImgLoaded = () => setImgLoaded(false);
    resetImgLoaded();
  }, [deal?.id]);

  if (!deal) return null;

  const storeInfo = STORE_INFO[deal.store];
  const savings = deal.originalPrice - deal.salePrice;

  const productUrl = `${deal.url}${deal.url.includes("?") ? "&" : "?"}utm_source=vrebajpopust&utm_medium=referral`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl animate-[scaleIn_0.2s_ease-out]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
            <Image
              src={getProxiedImageUrl(deal.imageUrl)}
              alt={deal.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              unoptimized
            />
            {/* Discount badge */}
            <div className="absolute left-3 top-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
              -{deal.discountPercent}%
            </div>
            {/* Store logo */}
            <div className="absolute right-3 top-3">
              <Image
                src={storeInfo.logo}
                alt={storeInfo.name}
                width={70}
                height={24}
                className="h-6 w-auto rounded bg-white/90 p-1"
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-5 flex flex-col">
            {/* Brand */}
            {deal.brand && (
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                {deal.brand}
              </p>
            )}

            {/* Name */}
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {deal.name}
            </h2>

            {/* Prices */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-red-600 dark:text-red-500">
                  {formatPrice(deal.salePrice)}
                </span>
                <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
                  {formatPrice(deal.originalPrice)}
                </span>
              </div>
              <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                Ušteda: {formatPrice(savings)}
              </p>
            </div>

            {/* Sizes */}
            {deal.sizes && deal.sizes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dostupne veličine:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deal.sizes.slice(0, 12).map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800"
                    >
                      {size}
                    </span>
                  ))}
                  {deal.sizes.length > 12 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-1">
                      +{deal.sizes.length - 12}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-5 space-y-3">
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 font-semibold text-white transition-colors cursor-pointer"
              >
                Kupi na {storeInfo.name}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="flex gap-2">
                <Link
                  href={`/ponuda/${deal.id}`}
                  className="flex-1 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={onClose}
                >
                  Pogledaj detalje
                </Link>
                <div className="flex items-center">
                  <WishlistButton deal={deal} size="md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
