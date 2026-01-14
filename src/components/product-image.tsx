"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductImageProps {
  src: string;
  alt: string;
}

export function ProductImage({ src, alt }: ProductImageProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      className={`object-contain p-4 transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setImgLoaded(true)}
      unoptimized
    />
  );
}
