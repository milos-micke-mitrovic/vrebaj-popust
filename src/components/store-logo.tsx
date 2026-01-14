"use client";

import { useState } from "react";
import Image from "next/image";
import { Store } from "@/types/deal";

const STORE_STYLES: Record<Store, { name: string; color: string }> = {
  djaksport: { name: "DJAK", color: "bg-red-600" },
  planeta: { name: "PLANETA", color: "bg-blue-600" },
  sportvision: { name: "SV", color: "bg-orange-600" },
  nsport: { name: "N-SPORT", color: "bg-green-600" },
  buzz: { name: "BUZZ", color: "bg-yellow-500" },
  officeshoes: { name: "OFFICE", color: "bg-purple-600" },
};

interface StoreLogoProps {
  store: Store;
  logoUrl: string;
  storeName: string;
  storeUrl?: string;
}

export function StoreLogo({ store, logoUrl, storeName, storeUrl }: StoreLogoProps) {
  const [imgError, setImgError] = useState(false);
  const storeStyle = STORE_STYLES[store];

  const content = imgError ? (
    <>
      <div
        className={`${storeStyle.color} rounded px-2 py-1 text-xs font-bold text-white`}
      >
        {storeStyle.name}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">{storeName}</span>
    </>
  ) : (
    <>
      <Image
        src={logoUrl}
        alt={storeName}
        width={80}
        height={32}
        className="h-8 w-auto"
        onError={() => setImgError(true)}
      />
      <span className="text-sm text-gray-600 dark:text-gray-400">{storeName}</span>
    </>
  );

  if (storeUrl) {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
      >
        {content}
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {content}
    </div>
  );
}
