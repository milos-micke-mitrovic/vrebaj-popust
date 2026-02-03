import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { safeJsonLd } from "@/lib/json-ld";

// Revalidate every 5 minutes - pages auto-refresh with new data
export const revalidate = 300;

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata dynamically based on query params
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = Object.keys(params).length > 0;

  // If page has query parameters (user filter state), noindex to avoid duplicates
  // SEO landing pages are at /ponude/[filter] instead
  if (hasFilters) {
    return {
      title: "Sve ponude | VrebajPopust - Popusti preko 50%",
      description:
        "Pregledaj sve aktivne popuste i akcije preko 50% na DjakSport, Planeta Sport, Sport Vision i drugim prodavnicama u Srbiji.",
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: "https://www.vrebajpopust.rs/ponude",
      },
    };
  }

  return {
    title: "Sve ponude | VrebajPopust - Popusti preko 50%",
    description:
      "Pregledaj sve aktivne popuste i akcije preko 50% na DjakSport, Planeta Sport, Sport Vision i drugim prodavnicama u Srbiji. Filtriraj po brendu, kategoriji i ceni.",
    keywords: [
      "popusti",
      "akcije",
      "sniženja",
      "srbija",
      "djak sport",
      "planeta sport",
      "sport vision",
      "patike",
      "sportska oprema",
    ],
    openGraph: {
      title: "Sve ponude | VrebajPopust",
      description:
        "Pregledaj sve aktivne popuste preko 50% u sportskim prodavnicama u Srbiji.",
      type: "website",
      locale: "sr_RS",
    },
    alternates: {
      canonical: "https://www.vrebajpopust.rs/ponude",
    },
  };
}

// Calculate price valid date at build time (7 days from build)
const priceValidUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default async function PonudePage() {
  // Get just the count and top deals for SEO schema (much lighter than loading all deals)
  const [totalCount, topDeals] = await Promise.all([
    prisma.deal.count({ where: { discountPercent: { gte: 50 } } }),
    prisma.deal.findMany({
      where: { discountPercent: { gte: 50 } },
      orderBy: { discountPercent: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        brand: true,
        salePrice: true,
        imageUrl: true,
      },
    }),
  ]);

  // ItemList for product listings (top 10 for SEO)
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Najveći popusti",
    description: "Proizvodi sa najvećim popustima preko 50%",
    numberOfItems: totalCount,
    itemListElement: topDeals.map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: deal.name,
        url: `https://www.vrebajpopust.rs/ponuda/${deal.id}`,
        image: deal.imageUrl?.startsWith("/")
          ? `https://www.vrebajpopust.rs${deal.imageUrl}`
          : deal.imageUrl,
        brand: deal.brand ? { "@type": "Brand", name: deal.brand } : undefined,
        offers: {
          "@type": "Offer",
          price: deal.salePrice,
          priceCurrency: "RSD",
          availability: "https://schema.org/InStock",
          priceValidUntil: priceValidUntilDate,
        },
      },
    })),
  };

  // CollectionPage schema
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "VrebajPopust - Sve ponude",
    description: `${totalCount} proizvoda sa popustima preko 50%`,
    url: "https://www.vrebajpopust.rs/ponude",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
    },
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: "https://www.vrebajpopust.rs",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sve ponude",
        item: "https://www.vrebajpopust.rs/ponude",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
            }
          >
            <DealsGrid />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
