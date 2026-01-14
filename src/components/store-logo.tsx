"use client";

import { useState } from "react";
import { Store } from "@/types/deal";

const STORE_STYLES: Record<Store, { name: string; color: string }> = {
  djaksport: { name: "DJAK", color: "bg-red-600" },
  planeta: { name: "PLANETA", color: "bg-blue-600" },
  sportvision: { name: "SV", color: "bg-orange-600" },
  nsport: { name: "N-SPORT", color: "bg-green-600" },
  buzz: { name: "BUZZ", color: "bg-yellow-500" },
};

interface StoreLogoProps {
  store: Store;
  logoUrl: string;
  storeName: string;
}

export function StoreLogo({ store, logoUrl, storeName }: StoreLogoProps) {
  const [imgError, setImgError] = useState(false);
  const storeStyle = STORE_STYLES[store];

  if (imgError) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`${storeStyle.color} rounded px-2 py-1 text-xs font-bold text-white`}
        >
          {storeStyle.name}
        </div>
        <span className="text-sm text-gray-500">{storeName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={logoUrl}
        alt={storeName}
        className="h-8 w-auto"
        onError={() => setImgError(true)}
      />
      <span className="text-sm text-gray-500">{storeName}</span>
    </div>
  );
}
