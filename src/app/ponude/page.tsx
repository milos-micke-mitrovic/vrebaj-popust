import { Metadata } from "next";
import { Suspense } from "react";
import {
  getAllDeals,
  getUniqueBrands,
  getUniqueStores,
  getUniqueCategories,
  getPriceRange,
} from "@/lib/deals";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Sve ponude | VrebajPopust - Popusti preko 50%",
  description:
    "Pregledaj sve aktivne popuste preko 50% na DjakSport, Planeta Sport, Sport Vision i drugim prodavnicama u Srbiji. Filtriraj po brendu, kategoriji i ceni.",
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
};

// Calculate price valid date at build time (7 days from build)
const priceValidUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default function PonudePage() {
  const deals = getAllDeals();
  const brands = getUniqueBrands();
  const stores = getUniqueStores();
  const categories = getUniqueCategories();
  const priceRange = getPriceRange();

  // ItemList for product listings (top 10 for SEO)
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Najbolji popusti",
    description: "Proizvodi sa najvećim popustima preko 50%",
    numberOfItems: deals.length,
    itemListElement: deals.slice(0, 10).map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: deal.name,
        url: `https://vrebajpopust.rs/deal/${deal.id}`,
        image: deal.imageUrl?.startsWith("/")
          ? `https://vrebajpopust.rs${deal.imageUrl}`
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
    description: `${deals.length} proizvoda sa popustima preko 50%`,
    url: "https://vrebajpopust.rs/ponude",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: deals.length,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500">Učitavanje...</div>
            }
          >
            <DealsGrid
              deals={deals}
              brands={brands}
              stores={stores}
              categories={categories}
              priceRange={priceRange}
            />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
