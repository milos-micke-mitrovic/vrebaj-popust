import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

// Replace with your GA4 Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ef4444",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://vrebajpopust.rs"),
  title: {
    default: "VrebajPopust | Najbolji popusti preko 50% u Srbiji",
    template: "%s | VrebajPopust",
  },
  description:
    "Pronađi najbolje popuste i sniženja preko 50% na sportsku opremu, obuću i odeću u Srbiji. DjakSport, Planeta Sport i druge prodavnice. Ažurirano svakodnevno.",
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
    "fashion and friends",
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
    url: "https://vrebajpopust.rs",
    siteName: "VrebajPopust",
    title: "VrebajPopust | Najbolji popusti preko 50% u Srbiji",
    description:
      "Pronađi najbolje popuste i sniženja preko 50% na sportsku opremu u Srbiji. Ažurirano svakodnevno.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "VrebajPopust - Najbolji popusti u Srbiji",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VrebajPopust | Najbolji popusti preko 50% u Srbiji",
    description: "Pronađi najbolje popuste preko 50% u Srbiji.",
    images: ["/opengraph-image.png"],
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
    canonical: "https://vrebajpopust.rs",
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
  url: "https://vrebajpopust.rs",
  logo: "https://vrebajpopust.rs/logos/logo.png",
  description: "Agregator najboljih popusta preko 50% u Srbiji",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" dir="ltr">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="geo.region" content="RS" />
        <meta name="geo.placename" content="Serbia" />
        <meta name="language" content="Serbian" />
        <meta name="revisit-after" content="1 day" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
