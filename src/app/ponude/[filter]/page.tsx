import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllDealsAsync } from "@/lib/deals";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Store, Category, Deal } from "@/types/deal";

// Revalidate every 5 minutes
export const revalidate = 300;

// Filter configurations for SEO pages
interface FilterConfig {
  type: "category" | "brand" | "gender";
  title: string;
  description: string;
  keywords: string[];
  filter: (deal: Deal) => boolean;
}

// Popular categories for SEO
const CATEGORY_FILTERS: Record<string, FilterConfig> = {
  patike: {
    type: "category",
    title: "Patike na popustu",
    description: "Najbolji popusti na patike preko 50%. Nike, Adidas, Puma i druge poznate marke po sniženim cenama. Pronađi idealne patike za trčanje, trening ili svakodnevno nošenje.",
    keywords: ["patike popust", "patike akcija", "patike sniženje", "jeftine patike", "sportske patike"],
    filter: (deal) => deal.category === "patike",
  },
  cipele: {
    type: "category",
    title: "Cipele na popustu",
    description: "Cipele na akciji sa popustima preko 50%. Sportske cipele, planinarske cipele i casual obuća po najboljim cenama u Srbiji.",
    keywords: ["cipele popust", "cipele akcija", "sportske cipele", "planinarske cipele"],
    filter: (deal) => deal.category === "cipele",
  },
  cizme: {
    type: "category",
    title: "Čizme na popustu",
    description: "Čizme na sniženju preko 50%. Zimske čizme, planinarske čizme i čizme za kišu po povoljnim cenama.",
    keywords: ["čizme popust", "zimske čizme", "čizme sniženje", "čizme akcija"],
    filter: (deal) => deal.category === "cizme",
  },
  jakne: {
    type: "category",
    title: "Jakne na popustu",
    description: "Sportske jakne sa popustima preko 50%. Zimske jakne, vetrovke, softshell jakne poznatih brendova.",
    keywords: ["jakne popust", "sportske jakne", "zimske jakne sniženje", "vetrovke akcija"],
    filter: (deal) => deal.category === "jakna",
  },
  trenerke: {
    type: "category",
    title: "Trenerke na popustu",
    description: "Trenerke na akciji preko 50% popusta. Nike, Adidas, Puma trenerke i komplet trenerke po sniženim cenama.",
    keywords: ["trenerke popust", "trenerke akcija", "komplet trenerke", "sportske trenerke"],
    filter: (deal) => deal.category === "trenerka",
  },
  majice: {
    type: "category",
    title: "Majice na popustu",
    description: "Sportske majice sa popustima preko 50%. Majice za trening, funkcionalne majice i casual majice.",
    keywords: ["majice popust", "sportske majice", "majice sniženje", "majice za trening"],
    filter: (deal) => deal.category === "majica",
  },
  duksevi: {
    type: "category",
    title: "Duksevi na popustu",
    description: "Duksevi na sniženju preko 50%. Duksevi sa kapuljačom, zip duksevi i sportski duksevi poznatih brendova.",
    keywords: ["duksevi popust", "duksevi akcija", "duks sa kapuljačom", "sportski duksevi"],
    filter: (deal) => deal.category === "duks",
  },
};

// Popular brands for SEO
const BRAND_FILTERS: Record<string, FilterConfig> = {
  nike: {
    type: "brand",
    title: "Nike popusti",
    description: "Nike proizvodi na akciji sa popustima preko 50%. Nike patike, Nike trenerke, Nike jakne i ostala Nike oprema po sniženim cenama.",
    keywords: ["nike popust", "nike akcija", "nike patike", "nike srbija", "nike sniženje"],
    filter: (deal) => deal.brand?.toUpperCase() === "NIKE",
  },
  adidas: {
    type: "brand",
    title: "Adidas popusti",
    description: "Adidas proizvodi na sniženju preko 50%. Adidas patike, Adidas trenerke i sportska oprema po najboljim cenama.",
    keywords: ["adidas popust", "adidas akcija", "adidas patike", "adidas srbija"],
    filter: (deal) => deal.brand?.toUpperCase() === "ADIDAS",
  },
  puma: {
    type: "brand",
    title: "Puma popusti",
    description: "Puma proizvodi na akciji sa preko 50% popusta. Puma patike, Puma odeća i oprema po sniženim cenama u Srbiji.",
    keywords: ["puma popust", "puma akcija", "puma patike", "puma srbija"],
    filter: (deal) => deal.brand?.toUpperCase() === "PUMA",
  },
  "new-balance": {
    type: "brand",
    title: "New Balance popusti",
    description: "New Balance patike i oprema na sniženju preko 50%. Pronađi NB 574, 990 i druge popularne modele po akcijskim cenama.",
    keywords: ["new balance popust", "new balance patike", "nb patike", "new balance srbija"],
    filter: (deal) => {
      const brand = deal.brand?.toUpperCase().replace(/_/g, " ");
      return brand === "NEW BALANCE" || brand === "NB";
    },
  },
  "under-armour": {
    type: "brand",
    title: "Under Armour popusti",
    description: "Under Armour sportska oprema na akciji preko 50%. UA patike, kompresiona odeća i oprema za trening.",
    keywords: ["under armour popust", "under armour srbija", "ua patike", "under armour akcija"],
    filter: (deal) => {
      const brand = deal.brand?.toUpperCase().replace(/_/g, " ");
      return brand === "UNDER ARMOUR" || brand === "UA";
    },
  },
  reebok: {
    type: "brand",
    title: "Reebok popusti",
    description: "Reebok proizvodi na sniženju preko 50%. Reebok patike, Reebok Classic i sportska odeća po povoljnim cenama.",
    keywords: ["reebok popust", "reebok patike", "reebok classic", "reebok srbija"],
    filter: (deal) => deal.brand?.toUpperCase() === "REEBOK",
  },
  converse: {
    type: "brand",
    title: "Converse popusti",
    description: "Converse starke na akciji preko 50%. All Star, Chuck Taylor i druge Converse patike po sniženim cenama.",
    keywords: ["converse popust", "starke popust", "all star patike", "converse srbija"],
    filter: (deal) => deal.brand?.toUpperCase() === "CONVERSE",
  },
  fila: {
    type: "brand",
    title: "Fila popusti",
    description: "Fila proizvodi na sniženju preko 50%. Fila patike, Fila odeća i retro modeli po akcijskim cenama.",
    keywords: ["fila popust", "fila patike", "fila srbija", "fila akcija"],
    filter: (deal) => deal.brand?.toUpperCase() === "FILA",
  },
  champion: {
    type: "brand",
    title: "Champion popusti",
    description: "Champion proizvodi na akciji preko 50%. Champion duksevi, majice i sportska odeća po sniženim cenama.",
    keywords: ["champion popust", "champion duksevi", "champion srbija", "champion akcija"],
    filter: (deal) => deal.brand?.toUpperCase() === "CHAMPION",
  },
  vans: {
    type: "brand",
    title: "Vans popusti",
    description: "Vans patike na sniženju preko 50%. Old Skool, Sk8-Hi i druge Vans patike po povoljnim cenama.",
    keywords: ["vans popust", "vans patike", "old skool popust", "vans srbija"],
    filter: (deal) => deal.brand?.toUpperCase() === "VANS",
  },
  skechers: {
    type: "brand",
    title: "Skechers popusti",
    description: "Skechers patike na akciji preko 50%. Udobne Skechers patike za svakodnevno nošenje po sniženim cenama.",
    keywords: ["skechers popust", "skechers patike", "skechers srbija", "skechers akcija"],
    filter: (deal) => deal.brand?.toUpperCase() === "SKECHERS",
  },
};

// Gender filters for SEO
const GENDER_FILTERS: Record<string, FilterConfig> = {
  muski: {
    type: "gender",
    title: "Muška sportska oprema na popustu",
    description: "Muška sportska oprema sa popustima preko 50%. Muške patike, trenerke, jakne i odeća poznatih brendova po sniženim cenama.",
    keywords: ["muška sportska oprema", "muške patike popust", "muške trenerke", "muška odeća akcija"],
    filter: (deal) => deal.gender === "muski",
  },
  zenski: {
    type: "gender",
    title: "Ženska sportska oprema na popustu",
    description: "Ženska sportska oprema na akciji preko 50%. Ženske patike, helanke, sportski grudnjaci i odeća po najboljim cenama.",
    keywords: ["ženska sportska oprema", "ženske patike popust", "ženske helanke", "ženska odeća akcija"],
    filter: (deal) => deal.gender === "zenski",
  },
  deciji: {
    type: "gender",
    title: "Dečija sportska oprema na popustu",
    description: "Dečija sportska oprema sa popustima preko 50%. Dečije patike, trenerke i odeća za decu po sniženim cenama.",
    keywords: ["dečija sportska oprema", "dečije patike popust", "dečije trenerke", "odeća za decu akcija"],
    filter: (deal) => deal.gender === "deciji",
  },
};

// Combine all filters
const ALL_FILTERS: Record<string, FilterConfig> = {
  ...CATEGORY_FILTERS,
  ...BRAND_FILTERS,
  ...GENDER_FILTERS,
};

// Generate static params for all filter pages
export async function generateStaticParams() {
  return Object.keys(ALL_FILTERS).map((filter) => ({ filter }));
}

interface Props {
  params: Promise<{ filter: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filter } = await params;
  const config = ALL_FILTERS[filter];

  if (!config) {
    return {
      title: "Stranica nije pronađena | VrebajPopust",
    };
  }

  return {
    title: `${config.title} | VrebajPopust`,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: `${config.title} | VrebajPopust`,
      description: config.description,
      type: "website",
      locale: "sr_RS",
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
      canonical: `https://vrebajpopust.rs/ponude/${filter}`,
    },
  };
}

// Brand normalization (same as ponude/page.tsx)
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

const GENDER_WORDS = new Set([
  "MUSKA", "MUSKI", "MUSKE", "MUSKARCI",
  "ZENSKA", "ZENSKI", "ZENSKE", "ZENE",
  "DECIJA", "DECIJI", "DECIJE", "DECA",
  "UNISEX"
]);

function normalizeBrand(brand: string): string | null {
  let normalized = brand.replace(/_/g, " ").trim().toUpperCase();
  if (GENDER_WORDS.has(normalized)) return null;
  if (BRAND_ALIASES[normalized]) return BRAND_ALIASES[normalized];
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (normalized.startsWith(alias + " ")) return canonical;
  }
  return normalized.split(" ").map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");
}

export default async function FilterPage({ params }: Props) {
  const { filter } = await params;
  const config = ALL_FILTERS[filter];

  if (!config) {
    notFound();
  }

  const allDeals = await getAllDealsAsync();
  const filteredDeals = allDeals.filter(config.filter);

  // Get brands, stores, categories from filtered deals
  const brands = [...new Set(
    filteredDeals
      .filter(d => d.brand)
      .map(d => normalizeBrand(d.brand!))
      .filter((b): b is string => b !== null)
  )].sort();

  const stores = [...new Set(filteredDeals.map(d => d.store))] as Store[];
  const categories = [...new Set(filteredDeals.map(d => d.category))] as Category[];
  const prices = filteredDeals.map(d => d.salePrice);
  const priceRange = prices.length > 0
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : { min: 0, max: 100000 };

  // Schema for SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    description: config.description,
    url: `https://vrebajpopust.rs/ponude/${filter}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: filteredDeals.length,
      itemListElement: filteredDeals.slice(0, 10).map((deal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: deal.name,
          url: `https://vrebajpopust.rs/ponuda/${deal.id}`,
          image: deal.imageUrl,
          brand: deal.brand ? { "@type": "Brand", name: deal.brand } : undefined,
          offers: {
            "@type": "Offer",
            price: deal.salePrice,
            priceCurrency: "RSD",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {/* SEO heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {config.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {filteredDeals.length} proizvoda sa popustima preko 50%
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
            }
          >
            <DealsGrid
              deals={filteredDeals}
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
