import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  parseFilterSlug,
  generateSeoTitle,
  generateSeoDescription,
  generateKeywords,
  ParsedFilter,
} from "@/lib/filter-parser";

// Revalidate every 5 minutes
export const revalidate = 300;

// Make this page dynamic - any valid filter combination works
export const dynamicParams = true;

// Pre-generate popular combinations for faster initial load
export async function generateStaticParams() {
  // Popular single filters
  const brands = ["nike", "adidas", "puma", "new-balance", "under-armour", "reebok", "converse", "fila", "champion", "vans", "skechers", "asics", "jordan", "the-north-face", "columbia", "hoka", "timberland", "lacoste", "tommy-hilfiger", "calvin-klein", "hummel", "umbro", "kappa", "ellesse", "diadora", "mizuno", "salomon", "crocs"];
  const categories = ["patike", "cipele", "cizme", "jakne", "trenerke", "majice", "duksevi", "sorcevi", "helanke"];
  const genders = ["muski", "zenski", "deciji"];

  const params: { filter: string }[] = [];

  // Single filters
  brands.forEach(b => params.push({ filter: b }));
  categories.forEach(c => params.push({ filter: c }));
  genders.forEach(g => params.push({ filter: g }));

  // Popular combinations: brand + category
  ["nike", "adidas", "puma"].forEach(brand => {
    ["patike", "jakne", "trenerke", "duksevi", "majice"].forEach(cat => {
      params.push({ filter: `${brand}-${cat}` });
    });
  });

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
      title: "Stranica nije pronađena | VrebajPopust",
    };
  }

  const title = generateSeoTitle(parsed);
  const description = generateSeoDescription(parsed);
  const keywords = generateKeywords(parsed);

  return {
    title: `${title} | VrebajPopust`,
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
      canonical: `https://vrebajpopust.rs/ponude/${filter}`,
    },
  };
}

// Build Prisma where clause from parsed filter
function buildWhereClause(parsed: ParsedFilter) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { discountPercent: { gte: 50 } };

  if (parsed.brand) {
    where.brand = { equals: parsed.brand, mode: "insensitive" };
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
      where.categories = { hasSome: [catPath] };
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

  // Get just count and top deals for SEO schema
  const where = buildWhereClause(parsed);
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
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
              seoSubtitle="Proizvodi sa popustima preko 50%"
              filterPageSlug={filter}
            />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
