import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPrisma } from "@/lib/db";
import { jsonArrayHasAny } from "@/lib/json-array";
import { getBrandVariants } from "@/lib/brand-utils";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { safeJsonLd } from "@/lib/json-ld";
import {
  parseFilterSlug,
  generateSeoTitle,
  generateSeoDescription,
  generateSeoIntro,
  generateKeywords,
  brandDisplay,
  ParsedFilter,
} from "@/lib/filter-parser";
import { getBrandInfo } from "@/lib/brand-descriptions";

// Revalidate every 5 minutes
export const revalidate = 300;

// Make this page dynamic - any valid filter combination works
export const dynamicParams = true;

// Pre-generate popular combinations for faster initial load
export async function generateStaticParams() {
  // Popular single filters
  const brands = ["nike", "adidas", "puma", "new-balance", "under-armour", "reebok", "converse", "fila", "champion", "vans", "skechers", "asics", "jordan", "the-north-face", "columbia", "hoka", "timberland", "lacoste", "tommy-hilfiger", "calvin-klein", "hummel", "umbro", "kappa", "ellesse", "diadora", "mizuno", "salomon", "crocs", "la-terra", "joma", "rang", "sergio-tacchini"];
  const categories = ["patike", "cipele", "cizme", "jakne", "trenerke", "majice", "duksevi", "sorcevi", "helanke"];
  const genders = ["muski", "zenski", "deciji"];
  const stores = ["djak-sport", "planeta-sport", "sport-vision", "n-sport", "buzz", "office-shoes", "intersport", "tref-sport"];

  const params: { filter: string }[] = [];

  // Single filters
  brands.forEach(b => params.push({ filter: b }));
  categories.forEach(c => params.push({ filter: c }));
  genders.forEach(g => params.push({ filter: g }));
  stores.forEach(s => params.push({ filter: s }));

  // Popular combinations: brand + category
  ["nike", "adidas", "puma"].forEach(brand => {
    ["patike", "jakne", "trenerke", "duksevi", "majice"].forEach(cat => {
      params.push({ filter: `${brand}-${cat}` });
    });
  });

  // House/high-demand brand patike pages (driven by Search Console)
  ["la-terra-patike", "joma-patike", "sergio-tacchini-patike", "rang-patike"].forEach(f =>
    params.push({ filter: f })
  );

  // Popular combinations: gender + category
  ["muski", "zenski"].forEach(gender => {
    ["patike", "jakne", "trenerke", "duksevi", "majice", "helanke"].forEach(cat => {
      params.push({ filter: `${gender}-${cat}` });
    });
  });

  // Popular combinations: gender + brand
  ["muski", "zenski"].forEach(gender => {
    ["nike", "adidas", "puma"].forEach(brand => {
      params.push({ filter: `${gender}-${brand}` });
    });
  });

  return params;
}

interface Props {
  params: Promise<{ filter: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filter } = await params;
  const parsed = parseFilterSlug(filter);

  if (!parsed.isValid) {
    return {
      title: "Stranica nije pronađena",
    };
  }

  const title = generateSeoTitle(parsed);
  const description = generateSeoDescription(parsed);
  const keywords = generateKeywords(parsed);

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: `${title} | VrebajPopust`,
      description,
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
      canonical: `https://www.vrebajpopust.rs/ponude/${filter}`,
    },
  };
}

// Build Prisma where clause from parsed filter
function buildWhereClause(parsed: ParsedFilter) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { discountPercent: { gte: 50 } };

  if (parsed.brand) {
    // Match every stored casing/variant of the brand (D1 has no case-insensitive
    // equals). getBrandVariants covers upper/lower/title/underscore + aliases.
    where.brand = { in: getBrandVariants(parsed.brand) };
  }
  if (parsed.gender) {
    where.gender = parsed.gender;
  }
  if (parsed.store) {
    where.store = parsed.store;
  }
  // Category filtering uses the categories array field
  if (parsed.category) {
    // Map category to categoryPath for database query
    const CATEGORY_TO_PATH: Record<string, string> = {
      patike: "obuca/patike",
      cipele: "obuca/cipele",
      cizme: "obuca/cizme",
      jakna: "odeca/jakne",
      majica: "odeca/majice",
      duks: "odeca/duksevi",
      trenerka: "odeca/trenerke",
      sorc: "odeca/sorcevi",
      helanke: "odeca/helanke",
      ranac: "oprema/torbe",
    };
    const catPath = CATEGORY_TO_PATH[parsed.category];
    if (catPath) {
      // categories is JSON-array TEXT on D1 — membership via jsonArrayHasAny.
      where.AND = [jsonArrayHasAny("categories", [catPath])];
    }
  }

  return where;
}

export default async function FilterPage({ params }: Props) {
  const { filter } = await params;
  const parsed = parseFilterSlug(filter);

  if (!parsed.isValid) {
    notFound();
  }

  const title = generateSeoTitle(parsed);
  const description = generateSeoDescription(parsed);
  const brandInfo = parsed.brand ? getBrandInfo(parsed.brand) : null;

  // Get just count and top deals for SEO schema
  const where = buildWhereClause(parsed);
  const prisma = await getPrisma();
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
    name: title,
    description: description,
    url: `https://www.vrebajpopust.rs/ponude/${filter}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
      itemListElement: topDeals.map((deal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: deal.name,
          url: `https://www.vrebajpopust.rs/ponuda/${deal.id}`,
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

  // Breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ponude",
        item: "https://www.vrebajpopust.rs/ponude",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `https://www.vrebajpopust.rs/ponude/${filter}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {/* Server-rendered h1 — DealsGrid (client) renders its own visible heading;
              this one is hidden but guarantees the h1 is in initial HTML for crawlers. */}
          <h1 className="sr-only">{title}</h1>

          {/* Crawlable links to top deals — DealsGrid below is client-rendered. */}
          <nav aria-label="Najpopularnije ponude" className="sr-only">
            <ul>
              {topDeals.map((deal) => (
                <li key={deal.id}>
                  <Link href={`/ponuda/${deal.id}`}>
                    {[deal.brand, deal.name].filter(Boolean).join(" ")}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
            }
          >
            <DealsGrid
              initialCategories={parsed.category ? [parsed.category] : undefined}
              initialBrands={parsed.brand ? [parsed.brand] : undefined}
              initialGenders={parsed.gender ? [parsed.gender] : undefined}
              initialStores={parsed.store ? [parsed.store] : undefined}
              seoTitle={title}
              seoSubtitle={description}
              filterPageSlug={filter}
            />
          </Suspense>

          {/* Unique on-page content so the landing page indexes and ranks instead
              of being treated as a thin/duplicate filtered grid. */}
          <section className="mt-12 rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {generateSeoIntro(parsed, totalCount)}
            </p>
            {brandInfo && parsed.brand && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  O brendu {brandDisplay(parsed.brand)}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {brandInfo.description}
                </p>
                {brandInfo.founded && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Osnovan: {brandInfo.founded}.
                    {brandInfo.country ? ` Zemlja porekla: ${brandInfo.country}.` : ""}
                  </p>
                )}
              </div>
            )}
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
