import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Category, Gender } from "@/types/deal";

// Revalidate every 5 minutes
export const revalidate = 300;

// Filter configurations for SEO pages
interface FilterConfig {
  type: "category" | "brand" | "gender";
  title: string;
  description: string;
  keywords: string[];
  // Initial values for DealsGrid
  initialCategories?: Category[];
  initialBrands?: string[];
  initialGenders?: Gender[];
}

// Popular categories for SEO
const CATEGORY_FILTERS: Record<string, FilterConfig> = {
  patike: {
    type: "category",
    title: "Patike na popustu",
    description: "Najbolji popusti na patike preko 50%. Nike, Adidas, Puma i druge poznate marke po sniženim cenama. Pronađi idealne patike za trčanje, trening ili svakodnevno nošenje.",
    keywords: ["patike popust", "patike akcija", "patike sniženje", "jeftine patike", "sportske patike"],
    initialCategories: ["patike"],
  },
  cipele: {
    type: "category",
    title: "Cipele na popustu",
    description: "Cipele na akciji sa popustima preko 50%. Sportske cipele, planinarske cipele i casual obuća po najboljim cenama u Srbiji.",
    keywords: ["cipele popust", "cipele akcija", "sportske cipele", "planinarske cipele"],
    initialCategories: ["cipele"],
  },
  cizme: {
    type: "category",
    title: "Čizme na popustu",
    description: "Čizme na sniženju preko 50%. Zimske čizme, planinarske čizme i čizme za kišu po povoljnim cenama.",
    keywords: ["čizme popust", "zimske čizme", "čizme sniženje", "čizme akcija"],
    initialCategories: ["cizme"],
  },
  jakne: {
    type: "category",
    title: "Jakne na popustu",
    description: "Sportske jakne sa popustima preko 50%. Zimske jakne, vetrovke, softshell jakne poznatih brendova.",
    keywords: ["jakne popust", "sportske jakne", "zimske jakne sniženje", "vetrovke akcija"],
    initialCategories: ["jakna"],
  },
  trenerke: {
    type: "category",
    title: "Trenerke na popustu",
    description: "Trenerke na akciji preko 50% popusta. Nike, Adidas, Puma trenerke i komplet trenerke po sniženim cenama.",
    keywords: ["trenerke popust", "trenerke akcija", "komplet trenerke", "sportske trenerke"],
    initialCategories: ["trenerka"],
  },
  majice: {
    type: "category",
    title: "Majice na popustu",
    description: "Sportske majice sa popustima preko 50%. Majice za trening, funkcionalne majice i casual majice.",
    keywords: ["majice popust", "sportske majice", "majice sniženje", "majice za trening"],
    initialCategories: ["majica"],
  },
  duksevi: {
    type: "category",
    title: "Duksevi na popustu",
    description: "Duksevi na sniženju preko 50%. Duksevi sa kapuljačom, zip duksevi i sportski duksevi poznatih brendova.",
    keywords: ["duksevi popust", "duksevi akcija", "duks sa kapuljačom", "sportski duksevi"],
    initialCategories: ["duks"],
  },
};

// Popular brands for SEO
const BRAND_FILTERS: Record<string, FilterConfig> = {
  nike: {
    type: "brand",
    title: "Nike popusti",
    description: "Nike proizvodi na akciji sa popustima preko 50%. Nike patike, Nike trenerke, Nike jakne i ostala Nike oprema po sniženim cenama.",
    keywords: ["nike popust", "nike akcija", "nike patike", "nike srbija", "nike sniženje"],
    initialBrands: ["NIKE"],
  },
  adidas: {
    type: "brand",
    title: "Adidas popusti",
    description: "Adidas proizvodi na sniženju preko 50%. Adidas patike, Adidas trenerke i sportska oprema po najboljim cenama.",
    keywords: ["adidas popust", "adidas akcija", "adidas patike", "adidas srbija"],
    initialBrands: ["ADIDAS"],
  },
  puma: {
    type: "brand",
    title: "Puma popusti",
    description: "Puma proizvodi na akciji sa preko 50% popusta. Puma patike, Puma odeća i oprema po sniženim cenama u Srbiji.",
    keywords: ["puma popust", "puma akcija", "puma patike", "puma srbija"],
    initialBrands: ["PUMA"],
  },
  "new-balance": {
    type: "brand",
    title: "New Balance popusti",
    description: "New Balance patike i oprema na sniženju preko 50%. Pronađi NB 574, 990 i druge popularne modele po akcijskim cenama.",
    keywords: ["new balance popust", "new balance patike", "nb patike", "new balance srbija"],
    initialBrands: ["NEW BALANCE"],
  },
  "under-armour": {
    type: "brand",
    title: "Under Armour popusti",
    description: "Under Armour sportska oprema na akciji preko 50%. UA patike, kompresiona odeća i oprema za trening.",
    keywords: ["under armour popust", "under armour srbija", "ua patike", "under armour akcija"],
    initialBrands: ["UNDER ARMOUR"],
  },
  reebok: {
    type: "brand",
    title: "Reebok popusti",
    description: "Reebok proizvodi na sniženju preko 50%. Reebok patike, Reebok Classic i sportska odeća po povoljnim cenama.",
    keywords: ["reebok popust", "reebok patike", "reebok classic", "reebok srbija"],
    initialBrands: ["REEBOK"],
  },
  converse: {
    type: "brand",
    title: "Converse popusti",
    description: "Converse starke na akciji preko 50%. All Star, Chuck Taylor i druge Converse patike po sniženim cenama.",
    keywords: ["converse popust", "starke popust", "all star patike", "converse srbija"],
    initialBrands: ["CONVERSE"],
  },
  fila: {
    type: "brand",
    title: "Fila popusti",
    description: "Fila proizvodi na sniženju preko 50%. Fila patike, Fila odeća i retro modeli po akcijskim cenama.",
    keywords: ["fila popust", "fila patike", "fila srbija", "fila akcija"],
    initialBrands: ["FILA"],
  },
  champion: {
    type: "brand",
    title: "Champion popusti",
    description: "Champion proizvodi na akciji preko 50%. Champion duksevi, majice i sportska odeća po sniženim cenama.",
    keywords: ["champion popust", "champion duksevi", "champion srbija", "champion akcija"],
    initialBrands: ["CHAMPION"],
  },
  vans: {
    type: "brand",
    title: "Vans popusti",
    description: "Vans patike na sniženju preko 50%. Old Skool, Sk8-Hi i druge Vans patike po povoljnim cenama.",
    keywords: ["vans popust", "vans patike", "old skool popust", "vans srbija"],
    initialBrands: ["VANS"],
  },
  skechers: {
    type: "brand",
    title: "Skechers popusti",
    description: "Skechers patike na akciji preko 50%. Udobne Skechers patike za svakodnevno nošenje po sniženim cenama.",
    keywords: ["skechers popust", "skechers patike", "skechers srbija", "skechers akcija"],
    initialBrands: ["SKECHERS"],
  },
};

// Gender filters for SEO
const GENDER_FILTERS: Record<string, FilterConfig> = {
  muski: {
    type: "gender",
    title: "Muška sportska oprema na popustu",
    description: "Muška sportska oprema sa popustima preko 50%. Muške patike, trenerke, jakne i odeća poznatih brendova po sniženim cenama.",
    keywords: ["muška sportska oprema", "muške patike popust", "muške trenerke", "muška odeća akcija"],
    initialGenders: ["muski"],
  },
  zenski: {
    type: "gender",
    title: "Ženska sportska oprema na popustu",
    description: "Ženska sportska oprema na akciji preko 50%. Ženske patike, helanke, sportski grudnjaci i odeća po najboljim cenama.",
    keywords: ["ženska sportska oprema", "ženske patike popust", "ženske helanke", "ženska odeća akcija"],
    initialGenders: ["zenski"],
  },
  deciji: {
    type: "gender",
    title: "Dečija sportska oprema na popustu",
    description: "Dečija sportska oprema sa popustima preko 50%. Dečije patike, trenerke i odeća za decu po sniženim cenama.",
    keywords: ["dečija sportska oprema", "dečije patike popust", "dečije trenerke", "odeća za decu akcija"],
    initialGenders: ["deciji"],
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

// Build Prisma where clause from config
function buildWhereClause(config: FilterConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { discountPercent: { gte: 50 } };

  if (config.initialBrands?.length) {
    where.brand = { in: config.initialBrands, mode: "insensitive" };
  }
  if (config.initialGenders?.length) {
    where.gender = { in: config.initialGenders };
  }
  // Category filtering is more complex since it's derived from name/url - skip for now
  // The API will handle category filtering client-side

  return where;
}

export default async function FilterPage({ params }: Props) {
  const { filter } = await params;
  const config = ALL_FILTERS[filter];

  if (!config) {
    notFound();
  }

  // Get just count and top deals for SEO schema
  const where = buildWhereClause(config);
  const [totalCount, topDeals] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
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

  // Schema for SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    description: config.description,
    url: `https://vrebajpopust.rs/ponude/${filter}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
      itemListElement: topDeals.map((deal, index) => ({
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
              Proizvodi sa popustima preko 50%
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
            }
          >
            <DealsGrid
              initialCategories={config.initialCategories}
              initialBrands={config.initialBrands}
              initialGenders={config.initialGenders}
            />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
