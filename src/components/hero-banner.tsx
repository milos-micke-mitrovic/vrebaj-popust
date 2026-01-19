import Image from "next/image";

// Tiny blur placeholder - dark gradient matching hero aesthetic
const blurDataURL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIwIiBoZWlnaHQ9IjEyODAiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzFmMjkzNyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzExMTgyNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=";

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
          placeholder="blur"
          blurDataURL={blurDataURL}
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
