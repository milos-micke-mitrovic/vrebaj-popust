"use client";

import { useState } from "react";
import Image from "next/image";

interface HeroBannerProps {
  children: React.ReactNode;
}

export function HeroBanner({ children }: HeroBannerProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <section className="relative overflow-hidden">
      {/* Background image with fade-in */}
      <div className="absolute inset-0 bg-gray-900">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75" />
      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
        {children}
      </div>
    </section>
  );
}
