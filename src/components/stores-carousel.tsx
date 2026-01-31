"use client";

import Image from "next/image";
import { Store } from "@/types/deal";
import { STORE_INFO } from "@/lib/deals";
import { useDragScroll } from "@/hooks/use-drag-scroll";

interface StoresCarouselProps {
  stores: Store[];
}

export function StoresCarousel({ stores }: StoresCarouselProps) {
  const { containerRef } = useDragScroll({ speed: 0.5 });

  // Duplicate stores for seamless infinite scroll
  const duplicatedStores = [...stores, ...stores];

  return (
    <section className="bg-white dark:bg-gray-800 py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl mb-8">
          Prodavnice koje pratimo
        </h2>
      </div>

      {/* Infinite scroll container */}
      <div className="relative">
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-gray-800 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-gray-800 to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div
          ref={containerRef}
          className="flex overflow-x-scroll scrollbar-hide select-none"
        >
          {duplicatedStores.map((store, index) => {
            const info = STORE_INFO[store];
            return (
              <div
                key={`${store}-${index}`}
                className="flex-shrink-0 mx-8 sm:mx-12"
              >
                <div className="flex flex-col items-center gap-3 group">
                  <div className="w-24 h-12 sm:w-32 sm:h-16 relative flex items-center justify-center">
                    <Image
                      src={info.logo}
                      alt={info.name}
                      width={128}
                      height={64}
                      className="object-contain max-h-full grayscale group-hover:grayscale-0 transition-all duration-300 dark:brightness-90 dark:group-hover:brightness-100"
                      draggable={false}
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {info.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
