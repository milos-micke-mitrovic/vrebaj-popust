import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { getAllDealsAsync } from "@/lib/deals";
import { AppProviders } from "@/components/app-providers";
import { DisableScrollRestoration } from "@/components/scroll-to-top";
import { ServiceWorkerCleanup } from "@/components/sw-cleanup";
import { safeJsonLd } from "@/lib/json-ld";
import "./globals.css";
import "@/styles/effects.css";

// Replace with your GA4 Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  display: "swap", // Prevent font from blocking render
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ef4444",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vrebajpopust.rs"),
  title: {
    default: "VrebajPopust | Najveći popusti preko 50% u Srbiji",
    template: "%s | VrebajPopust",
  },
  description:
    "Pronađi najveće popuste, akcije i sniženja preko 50% na sportsku opremu, obuću i odeću u Srbiji. DjakSport, Planeta Sport i druge prodavnice. Ažurirano svakodnevno.",
  keywords: [
    "popusti",
    "sniženja",
    "akcije",
    "srbija",
    "beograd",
    "novi sad",
    "sportska oprema",
    "patike",
    "obuća",
    "odeća",
    "djak sport",
    "planeta sport",
    "sport vision",
    "online kupovina",
    "jeftino",
    "outlet",
    "rasprodaja",
  ],
  authors: [{ name: "VrebajPopust" }],
  creator: "VrebajPopust",
  publisher: "VrebajPopust",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    url: "https://www.vrebajpopust.rs",
    siteName: "VrebajPopust",
    title: "VrebajPopust | Najveći popusti preko 50% u Srbiji",
    description:
      "Pronađi najveće popuste, akcije i sniženja preko 50% na sportsku opremu u Srbiji. Ažurirano svakodnevno.",
    images: [
      {
        url: "/opengraph-image.jpeg",
        width: 1200,
        height: 630,
        alt: "VrebajPopust - Najveći popusti u Srbiji",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VrebajPopust | Najveći popusti preko 50% u Srbiji",
    description: "Pronađi najveće popuste preko 50% u Srbiji.",
    images: ["/opengraph-image.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.vrebajpopust.rs",
  },
  category: "shopping",
  // Verification - add your codes when you have them
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
};

// Organization structured data for the entire site
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VrebajPopust",
  url: "https://www.vrebajpopust.rs",
  logo: "https://www.vrebajpopust.rs/logos/logo.png",
  description: "Pronađi najveće popuste preko 50% u Srbiji",
  foundingDate: "2024",
  areaServed: {
    "@type": "Country",
    name: "Serbia",
  },
  sameAs: [
    // Add social media links when available
    // "https://facebook.com/vrebajpopust",
    // "https://instagram.com/vrebajpopust",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deals = await getAllDealsAsync();
  const availableDealIds = deals.map((deal) => deal.id);

  return (
    <html lang="sr-Latn" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Preload hero image for faster LCP */}
        <link
          rel="preload"
          as="image"
          href="/_next/image?url=%2Fimages%2Fhero.webp&w=1920&q=75"
          imageSrcSet="/_next/image?url=%2Fimages%2Fhero.webp&w=640&q=75 640w, /_next/image?url=%2Fimages%2Fhero.webp&w=750&q=75 750w, /_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75 828w, /_next/image?url=%2Fimages%2Fhero.webp&w=1080&q=75 1080w, /_next/image?url=%2Fimages%2Fhero.webp&w=1200&q=75 1200w, /_next/image?url=%2Fimages%2Fhero.webp&w=1920&q=75 1920w"
          imageSizes="100vw"
        />
        {/* Preconnect to image domains for faster loading */}
        <link rel="preconnect" href="https://www.djaksport.com" />
        <link rel="preconnect" href="https://www.sportvision.rs" />
        <link rel="preconnect" href="https://planetasport.rs" />
        <link rel="preconnect" href="https://www.buzzsneakers.rs" />
        <link rel="preconnect" href="https://www.officeshoes.rs" />
        <link rel="preconnect" href="https://www.n-sport.net" />
        <link rel="dns-prefetch" href="https://www.djaksport.com" />
        <link rel="dns-prefetch" href="https://www.sportvision.rs" />
        <meta name="geo.region" content="RS" />
        <meta name="geo.placename" content="Serbia" />
        <meta name="language" content="Serbian" />
        <meta name="revisit-after" content="1 day" />
        {/* AI Search Optimization */}
        <meta name="ai-content-declaration" content="This website aggregates sports discounts from Serbian retailers. Content is factual and updated daily." />
        <meta name="ai-summary" content="VrebajPopust - Serbian sports discount aggregator. Find Nike, Adidas, Puma and more with 50%+ discounts from Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz, Office Shoes." />
        <link rel="author" href="https://www.vrebajpopust.rs/o-nama" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(organizationSchema),
          }}
        />
      </head>
      <body
        className={`${outfit.variable} font-sans antialiased`}
      >
        <ServiceWorkerCleanup />
        <DisableScrollRestoration />
        <AppProviders availableDealIds={availableDealIds} gaId={GA_MEASUREMENT_ID || undefined}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
