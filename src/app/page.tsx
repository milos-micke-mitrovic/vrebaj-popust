import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  getAllDeals,
  getUniqueBrands,
  getUniqueStores,
  getUniqueCategories,
  getPriceRange,
} from "@/lib/deals";
import { DealsGrid } from "@/components/deals-grid";

export const metadata: Metadata = {
  title: "VrebajPopust | Najbolji popusti preko 50% u Srbiji",
  description:
    "Pronađi najbolje popuste preko 50% na DjakSport, Planeta Sport, Sport Vision i drugim prodavnicama u Srbiji. Ažurirano svakodnevno.",
  keywords: [
    "popusti",
    "akcije",
    "sniženja",
    "srbija",
    "djak sport",
    "planeta sport",
    "sport vision",
    "online kupovina",
    "jeftino",
  ],
  openGraph: {
    title: "VrebajPopust | Najbolji popusti preko 50% u Srbiji",
    description:
      "Pronađi najbolje popuste preko 50% na DjakSport, Planeta Sport, Sport Vision i drugim prodavnicama.",
    type: "website",
    locale: "sr_RS",
  },
};

// Calculate price valid date at build time (7 days from build)
const priceValidUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default function Home() {
  const deals = getAllDeals();
  const brands = getUniqueBrands();
  const stores = getUniqueStores();
  const categories = getUniqueCategories();
  const priceRange = getPriceRange();

  // WebSite structured data with search
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VrebajPopust",
    description: "Najbolji popusti preko 50% u Srbiji",
    url: "https://vrebajpopust.rs",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://vrebajpopust.rs/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

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
    name: "VrebajPopust - Svi popusti",
    description: `${deals.length} proizvoda sa popustima preko 50%`,
    url: "https://vrebajpopust.rs",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: deals.length,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img
                  src="/logos/logo.png"
                  alt="VrebajPopust"
                  className="h-10 w-10"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Vrebaj<span className="text-red-500">Popust</span>
                  </h1>
                  <p className="hidden text-xs text-gray-500 sm:block">
                    Popusti preko 50% u Srbiji
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Suspense fallback={<div className="py-12 text-center text-gray-500">Učitavanje...</div>}>
            <DealsGrid
              deals={deals}
              brands={brands}
              stores={stores}
              categories={categories}
              priceRange={priceRange}
            />
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="border-t bg-white py-6">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logos/logo.png"
                  alt="VrebajPopust"
                  className="h-8 w-8"
                />
                <div>
                  <span className="text-lg font-semibold text-gray-900">
                    Vrebaj<span className="text-red-500">Popust</span>
                  </span>
                  <p className="text-xs text-gray-500">
                    Agregator popusta preko 50%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 hidden sm:block">Pretražujemo:</span>
                <img
                  src="/logos/djaksport.png"
                  alt="Djak Sport"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
                <img
                  src="/logos/planeta.png"
                  alt="Planeta Sport"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
                <img
                  src="/logos/sportvision.png"
                  alt="Sport Vision"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
                <img
                  src="/logos/nsport.jpg"
                  alt="N Sport"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
                <img
                  src="/logos/buzz.png"
                  alt="Buzz Sneakers"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
                <img
                  src="/logos/officeshoes.png"
                  alt="Office Shoes"
                  className="h-5 opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Cene se ažuriraju automatski. VrebajPopust nije odgovoran za tačnost cena.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
