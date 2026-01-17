import { Metadata } from "next";
import { Suspense } from "react";
import { getAllDealsAsync } from "@/lib/deals";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Store, Category } from "@/types/deal";

// Gender words that should not appear as brands
const GENDER_WORDS = new Set([
  "MUSKA", "MUSKI", "MUSKE", "MUSKARCI",
  "ZENSKA", "ZENSKI", "ZENSKE", "ZENE",
  "DECIJA", "DECIJI", "DECIJE", "DECA",
  "UNISEX"
]);

// Brand normalization map - maps variants to canonical name
const BRAND_ALIASES: Record<string, string> = {
  "CALVIN": "CALVIN KLEIN",
  "CALVIN KLEIN BLACK LABEL": "CALVIN KLEIN",
  "CALVIN KLEIN JEANS": "CALVIN KLEIN",
  "CK": "CALVIN KLEIN",
  "KARL": "KARL LAGERFELD",
  "NEW BALANCE": "NEW BALANCE",
  "TOMMY": "TOMMY HILFIGER",
  "TOMMY JEANS": "TOMMY HILFIGER",
};

function normalizeBrand(brand: string): string | null {
  // Replace underscores with spaces and trim
  let normalized = brand.replace(/_/g, " ").trim().toUpperCase();

  // Filter out gender words
  if (GENDER_WORDS.has(normalized)) {
    return null;
  }

  // Check for known aliases
  if (BRAND_ALIASES[normalized]) {
    return BRAND_ALIASES[normalized];
  }

  // Check if brand starts with a known prefix (for variants like CALVIN KLEIN JEANS)
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (normalized.startsWith(alias + " ")) {
      return canonical;
    }
  }

  // Return with proper casing (Title Case)
  return normalized
    .split(" ")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// Revalidate every 5 minutes - pages auto-refresh with new data
export const revalidate = 300;

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

export default async function PonudePage() {
  const deals = await getAllDealsAsync();

  // Derive brands, stores, categories, and price range from deals
  // Normalize brands and filter out invalid ones
  const brands = [...new Set(
    deals
      .filter(d => d.brand)
      .map(d => normalizeBrand(d.brand!))
      .filter((b): b is string => b !== null)
  )].sort();
  const stores = [...new Set(deals.map(d => d.store))] as Store[];
  const categories = [...new Set(deals.map(d => d.category))] as Category[];
  const prices = deals.map(d => d.salePrice);
  const priceRange = prices.length > 0
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : { min: 0, max: 100000 };

  // ItemList for product listings (top 10 for SEO)
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Najveći popusti",
    description: "Proizvodi sa najvećim popustima preko 50%",
    numberOfItems: deals.length,
    itemListElement: deals.slice(0, 10).map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: deal.name,
        url: `https://vrebajpopust.rs/ponuda/${deal.id}`,
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

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
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
