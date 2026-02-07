"use client";

import Image from "next/image";
import Link from "next/link";
import { Store } from "@/types/deal";
import { STORE_INFO } from "@/lib/deals";

// Store slugs for linking
const STORE_SLUGS: Record<Store, string> = {
  djaksport: "djak-sport",
  planeta: "planeta-sport",
  sportvision: "sport-vision",
  nsport: "n-sport",
  buzz: "buzz",
  officeshoes: "office-shoes",
  intersport: "intersport",
  trefsport: "tref-sport",
};

interface StoresCarouselProps {
  stores: Store[];
}

export function StoresCarousel({ stores }: StoresCarouselProps) {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Pratimo 8 prodavnica
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Svakodnevno proveravamo cene u najvećim sportskim prodavnicama u Srbiji
          </p>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {stores.map((store) => {
            const info = STORE_INFO[store];
            const slug = STORE_SLUGS[store];
            return (
              <Link
                key={store}
                href={`/ponude/${slug}`}
                className="group flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-full h-10 relative flex items-center justify-center mb-3">
                  <Image
                    src={info.logo}
                    alt={info.name}
                    width={100}
                    height={40}
                    className="object-contain max-h-full grayscale group-hover:grayscale-0 transition-all duration-300 dark:brightness-75 dark:group-hover:brightness-100"
                    draggable={false}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors font-medium">
                  Pogledaj →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
