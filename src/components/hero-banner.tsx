import Image from "next/image";

interface HeroBannerProps {
  children: React.ReactNode;
}

export function HeroBanner({ children }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image - LCP element, load immediately */}
      <div className="absolute inset-0 bg-gray-900">
        <Image
          src="/images/hero.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
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
