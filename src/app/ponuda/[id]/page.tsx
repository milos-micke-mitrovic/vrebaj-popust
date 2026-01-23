import { Metadata } from "next";
import Link from "next/link";
import { getDealByIdAsync, getAllDealsAsync, STORE_INFO } from "@/lib/deals";
import { getBrandInfo } from "@/lib/brand-descriptions";

// Revalidate every 5 minutes
export const revalidate = 300;
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { StoreLogo } from "@/components/store-logo";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DealCard } from "@/components/deal-card";
import { ShareButton } from "@/components/share-button";
import { ProductWishlistButton } from "@/components/product-wishlist-button";
import { ProductImage } from "@/components/product-image";
import { ProductBreadcrumb } from "@/components/product-breadcrumb";
import { ScrollToTop } from "@/components/scroll-to-top";
import { TrackProductView } from "@/components/track-product-view";
import { Deal } from "@/types/deal";

// Calculate price valid date at build time (7 days from build)
const priceValidUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

interface Props {
  params: Promise<{ id: string }>;
}

const CATEGORY_NAMES: Record<string, string> = {
  patike: "Patike",
  cipele: "Cipele",
  cizme: "Čizme",
  jakna: "Jakne",
  majica: "Majice",
  duks: "Duksevi",
  trenerka: "Trenerke",
  sorc: "Šorcevi",
  helanke: "Helanke",
  ranac: "Ranci i Torbe",
  ostalo: "Ostalo",
};

// New category path display names (matches deals-grid.tsx SUBCATEGORY_NAMES)
const CATEGORY_PATH_NAMES: Record<string, string> = {
  // Obuca
  "obuca/patike": "Patike",
  "obuca/cipele": "Cipele",
  "obuca/baletanke": "Baletanke",
  "obuca/cizme": "Čizme",
  "obuca/papuce": "Papuče",
  "obuca/sandale": "Sandale",
  "obuca/kopacke": "Kopačke",
  // Odeca
  "odeca/jakne": "Jakne",
  "odeca/prsluci": "Prsluci",
  "odeca/duksevi": "Duksevi",
  "odeca/majice": "Majice",
  "odeca/topovi": "Topovi",
  "odeca/pantalone": "Pantalone",
  "odeca/trenerke": "Trenerke",
  "odeca/helanke": "Helanke",
  "odeca/sortevi": "Šorcevi",
  "odeca/kupaci": "Kupaći",
  "odeca/haljine": "Haljine",
  "odeca/kosulje": "Košulje",
  "odeca/kombinezoni": "Kombinezoni",
  // Oprema
  "oprema/torbe": "Torbe",
  "oprema/rancevi": "Rančevi",
  "oprema/kacketi": "Kačketi",
  "oprema/carape": "Čarape",
  "oprema/kape": "Kape",
  "oprema/salovi": "Šalovi",
  "oprema/rukavice": "Rukavice",
  "oprema/vrece": "Vreće",
};

// Helper to get category display name from deal (prefers new categories array)
function getCategoryDisplayName(deal: { category: string; categories?: string[] }): string {
  // First check new categories array
  if (deal.categories && deal.categories.length > 0) {
    const firstCategory = deal.categories[0];
    if (CATEGORY_PATH_NAMES[firstCategory]) {
      return CATEGORY_PATH_NAMES[firstCategory];
    }
  }
  // Fall back to legacy category
  return CATEGORY_NAMES[deal.category] || "Proizvod";
}

// Helper to get category filter URL (prefers new categories array)
function getCategoryFilterUrl(deal: { category: string; categories?: string[] }): string {
  // First check new categories array
  if (deal.categories && deal.categories.length > 0) {
    const firstCategory = deal.categories[0];
    // Use catPaths for new category system
    return `/ponude?catPaths=${encodeURIComponent(firstCategory)}`;
  }
  // Fall back to legacy category
  return `/ponude?categories=${deal.category}`;
}

const GENDER_TAGS: Record<string, string> = {
  muski: "Muškarci",
  zenski: "Žene",
  deciji: "Deca",
  unisex: "",
};

const GENDER_TEXT: Record<string, string> = {
  muski: "za muškarce",
  zenski: "za žene",
  deciji: "za decu",
  unisex: "",
};

// Helper function to get related deals
async function getRelatedDeals(deal: Deal, limit: number = 8): Promise<Deal[]> {
  const allDeals = await getAllDealsAsync();
  const related: Deal[] = [];
  const seen = new Set<string>([deal.id]);

  const genderMatch = (d: Deal) =>
    d.gender === deal.gender || d.gender === "unisex" || deal.gender === "unisex";

  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.brand && d.brand === deal.brand && d.category === deal.category && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.category === deal.category && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  return related;
}

// Brand display names (URL slug -> display name)
const BRAND_DISPLAY_NAMES: Record<string, string> = {
  "nike": "Nike",
  "adidas": "Adidas",
  "puma": "Puma",
  "reebok": "Reebok",
  "converse": "Converse",
  "vans": "Vans",
  "fila": "Fila",
  "champion": "Champion",
  "jordan": "Jordan",
  "asics": "Asics",
  "skechers": "Skechers",
  "new-balance": "New Balance",
  "under-armour": "Under Armour",
  "the-north-face": "The North Face",
  "columbia": "Columbia",
  "hoka": "Hoka",
  "timberland": "Timberland",
  "lacoste": "Lacoste",
  "tommy": "Tommy Hilfiger",
  "calvin-klein": "Calvin Klein",
  "hummel": "Hummel",
  "umbro": "Umbro",
  "kappa": "Kappa",
  "ellesse": "Ellesse",
  "diadora": "Diadora",
  "mizuno": "Mizuno",
  "salomon": "Salomon",
  "crocs": "Crocs",
};

// Category display names for expired page
// grammaticalGender: "m" = masculine (Drugi), "f" = feminine (Druge)
const CATEGORY_DISPLAY_EXPIRED: Record<string, {
  singular: string;
  plural: string;
  filterSlug: string;
  catPath: string;
  grammaticalGender: "m" | "f";
}> = {
  "patike": { singular: "patike", plural: "patike", filterSlug: "patike", catPath: "obuca/patike", grammaticalGender: "f" },
  "cipele": { singular: "cipele", plural: "cipele", filterSlug: "cipele", catPath: "obuca/cipele", grammaticalGender: "f" },
  "cizme": { singular: "čizme", plural: "čizme", filterSlug: "cizme", catPath: "obuca/cizme", grammaticalGender: "f" },
  "jakna": { singular: "jakna", plural: "jakne", filterSlug: "jakne", catPath: "odeca/jakne", grammaticalGender: "f" },
  "majica": { singular: "majica", plural: "majice", filterSlug: "majice", catPath: "odeca/majice", grammaticalGender: "f" },
  "duks": { singular: "duks", plural: "duksevi", filterSlug: "duksevi", catPath: "odeca/duksevi", grammaticalGender: "m" },
  "trenerka": { singular: "trenerka", plural: "trenerke", filterSlug: "trenerke", catPath: "odeca/trenerke", grammaticalGender: "f" },
  "sorc": { singular: "šorc", plural: "šorcevi", filterSlug: "sortevi", catPath: "odeca/sortevi", grammaticalGender: "m" },
  "helanke": { singular: "helanke", plural: "helanke", filterSlug: "helanke", catPath: "odeca/helanke", grammaticalGender: "f" },
  "ranac": { singular: "ranac", plural: "ranci", filterSlug: "ranac", catPath: "oprema/torbe", grammaticalGender: "m" },
};

interface UrlExtractedInfo {
  brand: string | null;       // Display name (e.g., "Nike")
  brandSlug: string | null;   // URL slug (e.g., "nike")
  category: string | null;    // Category key (e.g., "patike")
  categoryDisplay: string | null;  // Display name (e.g., "patike")
  gender: string | null;      // Gender key (e.g., "muski")
}

// Extract product info from URL for display on expired pages
function extractInfoFromUrl(productId: string): UrlExtractedInfo {
  const idLower = productId.toLowerCase();

  // Common brand names to look for in URL
  const brandSlugs = Object.keys(BRAND_DISPLAY_NAMES);
  const categories = Object.keys(CATEGORY_DISPLAY_EXPIRED);
  const genders = ["muski", "muskarce", "zenski", "zene", "deciji", "deca", "devojcice", "decaci"];

  // Extract hints from URL
  const foundBrandSlug = brandSlugs.find(b => idLower.includes(b));
  const foundCategory = categories.find(c => idLower.includes(c));
  const foundGender = genders.find(g => idLower.includes(g));

  // Map gender variations
  let genderNormalized: string | null = null;
  if (foundGender) {
    if (["muski", "muskarce"].includes(foundGender)) genderNormalized = "muski";
    else if (["zenski", "zene"].includes(foundGender)) genderNormalized = "zenski";
    else if (["deciji", "deca", "devojcice", "decaci"].includes(foundGender)) genderNormalized = "deciji";
  }

  return {
    brand: foundBrandSlug ? BRAND_DISPLAY_NAMES[foundBrandSlug] : null,
    brandSlug: foundBrandSlug || null,
    category: foundCategory || null,
    categoryDisplay: foundCategory ? CATEGORY_DISPLAY_EXPIRED[foundCategory].plural : null,
    gender: genderNormalized,
  };
}

// Helper function to get relevant deals based on URL keywords (for missing products)
async function getRelevantDealsFromUrl(productId: string, limit: number = 8): Promise<Deal[]> {
  const allDeals = await getAllDealsAsync();
  const info = extractInfoFromUrl(productId);

  // Score and filter deals based on matches
  const scored = allDeals.map(deal => {
    let score = 0;
    if (info.brandSlug && deal.brand?.toLowerCase().includes(info.brandSlug)) score += 3;
    if (info.category && deal.category === info.category) score += 2;
    if (info.gender && deal.gender === info.gender) score += 1;
    return { deal, score };
  });

  // Sort by score (highest first), then by discount
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.deal.discountPercent - a.deal.discountPercent;
  });

  // Return top matches (only if they have some relevance)
  const relevant = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.deal);

  // If no relevant matches, return top deals by discount
  if (relevant.length < limit) {
    const topDeals = allDeals.slice(0, limit - relevant.length);
    return [...relevant, ...topDeals.filter(d => !relevant.includes(d))].slice(0, limit);
  }

  return relevant;
}

// No generateStaticParams - pages render on-demand (not pre-built)
// This speeds up builds significantly since we have 4000-10000 products
// Pages are still indexed via sitemap, just rendered dynamically on first visit

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const deal = await getDealByIdAsync(id);

  if (!deal) {
    // Try to extract brand from URL for better SEO on unavailable pages
    const idLower = id.toLowerCase();
    const brands = ["nike", "adidas", "puma", "reebok", "converse", "jordan", "asics"];
    const foundBrand = brands.find(b => idLower.includes(b));
    const brandText = foundBrand ? `${foundBrand.charAt(0).toUpperCase() + foundBrand.slice(1)} ` : "";

    return {
      title: `${brandText}Ponuda više nije dostupna | VrebajPopust`,
      description: `Ova ${brandText.toLowerCase()}ponuda više nije dostupna. Pogledajte druge aktuelne ${brandText.toLowerCase()}popuste preko 50% na sportsku opremu u Srbiji.`,
      robots: {
        index: false,  // Don't index unavailable products
        follow: true,  // But follow links to alternatives
      },
    };
  }

  const storeInfo = STORE_INFO[deal.store];
  const genderText = GENDER_TEXT[deal.gender] || "";
  const categoryText = getCategoryDisplayName(deal);

  const savings = deal.originalPrice - deal.salePrice;
  const title = `${deal.name} - ${deal.discountPercent}% popust | VrebajPopust`;
  const description = `${deal.brand || ""} ${categoryText} ${genderText} na akciji u ${storeInfo.name}. Stara cena: ${formatPrice(deal.originalPrice)}, nova cena: ${formatPrice(deal.salePrice)}. Uštedi ${formatPrice(savings)}! Pronađi najveće sportske popuste u Srbiji.`.trim();

  const imageUrl = deal.imageUrl?.startsWith("/")
    ? `https://vrebajpopust.rs${deal.imageUrl}`
    : deal.imageUrl;

  return {
    title,
    description,
    keywords: [
      deal.name,
      deal.brand,
      categoryText,
      storeInfo.name,
      "popust",
      "akcija",
      "sniženje",
      "srbija",
      "online kupovina",
      `${deal.discountPercent}% popust`,
      `${deal.brand} popust`,
      `${categoryText.toLowerCase()} na akciji`,
    ].filter(Boolean) as string[],
    openGraph: {
      title: `${deal.name} - ${deal.discountPercent}% POPUST | VrebajPopust`,
      description,
      url: `https://vrebajpopust.rs/ponuda/${id}`,
      siteName: "VrebajPopust",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: `${deal.name} - ${deal.brand || ""} ${categoryText} sa ${deal.discountPercent}% popusta`,
            },
          ]
        : [],
      type: "article",
      locale: "sr_RS",
    },
    twitter: {
      card: "summary_large_image",
      title: `${deal.name} - ${deal.discountPercent}% POPUST`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: `https://vrebajpopust.rs/ponuda/${id}`,
    },
    robots: {
      index: true,  // Index product pages for long-tail SEO traffic
      follow: true,
    },
  };
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const deal = await getDealByIdAsync(id);

  // Product not available - show friendly page with relevant alternatives
  if (!deal) {
    // Extract brand/category/gender info from URL for personalized messaging
    const urlInfo = extractInfoFromUrl(id);
    const relevantDeals = await getRelevantDealsFromUrl(id, 8);

    // Build personalized message
    let productDescription = "Ponuda";
    if (urlInfo.brand && urlInfo.categoryDisplay) {
      productDescription = `${urlInfo.brand} ${urlInfo.categoryDisplay}`;
    } else if (urlInfo.brand) {
      productDescription = `${urlInfo.brand} proizvod`;
    } else if (urlInfo.categoryDisplay) {
      productDescription = urlInfo.categoryDisplay.charAt(0).toUpperCase() + urlInfo.categoryDisplay.slice(1);
    }

    // Build smart CTA link and text
    // Always use /ponude with query params (SEO pages are only for Google landing)
    let ctaHref = "/ponude";
    let ctaText = "Pregledaj sve ponude";
    let sectionHeading = "Aktuelne ponude sa popustima preko 50%";

    if (urlInfo.brandSlug && urlInfo.category) {
      const categoryInfo = CATEGORY_DISPLAY_EXPIRED[urlInfo.category];
      // Use query params: /ponude?brands=HUMMEL&categories=duks
      ctaHref = `/ponude?brands=${encodeURIComponent(urlInfo.brand!)}&categories=${urlInfo.category}`;
      ctaText = `${urlInfo.brand} ${urlInfo.categoryDisplay} na popustu`;
      const drugPrefix = categoryInfo.grammaticalGender === "m" ? "Drugi" : "Druge";
      sectionHeading = `${drugPrefix} ${urlInfo.brand} ${urlInfo.categoryDisplay} na akciji`;
    } else if (urlInfo.brandSlug) {
      // Use query params: /ponude?brands=HUMMEL
      ctaHref = `/ponude?brands=${encodeURIComponent(urlInfo.brand!)}`;
      ctaText = `${urlInfo.brand} na popustu`;
      sectionHeading = `Drugi ${urlInfo.brand} proizvodi na akciji`;
    } else if (urlInfo.category) {
      const categoryInfo = CATEGORY_DISPLAY_EXPIRED[urlInfo.category];
      // Use query params: /ponude?categories=duks
      ctaHref = `/ponude?categories=${urlInfo.category}`;
      const capitalizedCategory = urlInfo.categoryDisplay!.charAt(0).toUpperCase() + urlInfo.categoryDisplay!.slice(1);
      ctaText = `${capitalizedCategory} na popustu`;
      const drugPrefix = categoryInfo.grammaticalGender === "m" ? "Drugi" : "Druge";
      sectionHeading = `${drugPrefix} ${urlInfo.categoryDisplay} na akciji`;
    }

    return (
      <>
        <ScrollToTop />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <Header />

        <main className="mx-auto max-w-7xl px-4 py-12">
          {/* Unavailable Message */}
          <div className="mx-auto max-w-2xl text-center mb-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {productDescription} više nije na akciji
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Proizvod je možda rasprodat ili je popust istekao.
              Pogledajte druge aktuelne ponude sa popustima preko 50%.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={ctaHref}
                className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 transition-colors"
              >
                {ctaText} →
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Početna stranica
              </Link>
            </div>
          </div>

          {/* Relevant Deals Section - based on URL keywords */}
          {relevantDeals.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {sectionHeading}
              </h2>
              <div className="flex flex-wrap gap-3">
                {relevantDeals.map((relevantDeal) => (
                  <div key={relevantDeal.id} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]">
                    <DealCard deal={relevantDeal} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
        </div>
      </>
    );
  }

  const storeInfo = STORE_INFO[deal.store];
  const savings = deal.originalPrice - deal.salePrice;
  const categoryText = getCategoryDisplayName(deal);
  const genderText = GENDER_TEXT[deal.gender] || "";
  const genderTag = GENDER_TAGS[deal.gender] || "";
  const relatedDeals = await getRelatedDeals(deal, 8);

  // Add UTM tracking to external URLs
  const addUtmParams = (url: string) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}utm_source=vrebajpopust&utm_medium=referral`;
  };

  const productUrl = addUtmParams(deal.url);
  const storeUrl = addUtmParams(storeInfo.url);

  const imageUrl = deal.imageUrl?.startsWith("/")
    ? `https://vrebajpopust.rs${deal.imageUrl}`
    : deal.imageUrl;

  // Fallback image for structured data (required by Google)
  const schemaImageUrl = imageUrl || "https://vrebajpopust.rs/opengraph-image.png";

  // Generate a short SKU from deal ID (Google requires max ~50 chars)
  // Use hash of full ID to ensure uniqueness while keeping it short
  const shortSku = deal.id.length > 50
    ? deal.id.slice(0, 20) + "-" + deal.id.slice(-20)
    : deal.id;

  // Product structured data - enhanced for better SEO
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.name,
    image: schemaImageUrl,
    description: `${deal.brand || ""} ${categoryText} ${genderText} sa ${deal.discountPercent}% popusta. Originalna cena ${formatPrice(deal.originalPrice)}, sada samo ${formatPrice(deal.salePrice)}. Dostupno u ${storeInfo.name}.`.trim(),
    sku: shortSku,
    brand: deal.brand
      ? {
          "@type": "Brand",
          name: deal.brand,
        }
      : undefined,
    category: categoryText,
    itemCondition: "https://schema.org/NewCondition",
    offers: {
      "@type": "Offer",
      url: `https://vrebajpopust.rs/ponuda/${deal.id}`,
      price: deal.salePrice,
      priceCurrency: "RSD",
      availability: "https://schema.org/InStock",
      priceValidUntil: priceValidUntilDate,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: storeInfo.name,
        url: storeInfo.url,
      },
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
        item: "https://vrebajpopust.rs/ponude",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryText,
        item: `https://vrebajpopust.rs${getCategoryFilterUrl(deal)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: deal.name,
        item: `https://vrebajpopust.rs/ponuda/${deal.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <TrackProductView deal={deal} />
      <ScrollToTop />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />

        {/* Breadcrumb Navigation */}
        <ProductBreadcrumb
          items={[
            { label: "Ponude", href: "/ponude" },
            { label: categoryText, href: getCategoryFilterUrl(deal) },
            { label: deal.name },
          ]}
        />

        {/* Product Details */}
        <main className="mx-auto max-w-7xl px-4 py-6">
          <article itemScope itemType="https://schema.org/Product">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
                {deal.imageUrl ? (
                  <ProductImage
                    src={getProxiedImageUrl(deal.imageUrl)}
                    alt={`${deal.name} - ${deal.brand || ""} ${categoryText}`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                    Nema slike
                  </div>
                )}
                {/* Discount ribbon */}
                <div className="absolute -left-12 top-5 rotate-[-45deg] bg-gradient-to-r from-red-500 to-red-600 px-20 py-2 text-lg font-bold text-white shadow-md ribbon-shimmer">
                  -{deal.discountPercent}%
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col">
                {/* Store */}
                <div className="mb-4">
                  <StoreLogo
                    store={deal.store}
                    logoUrl={storeInfo.logo}
                    storeName={storeInfo.name}
                    storeUrl={storeUrl}
                  />
                </div>

                {/* Brand */}
                {deal.brand && (
                  <p
                    className="text-sm font-medium uppercase text-gray-500 dark:text-gray-400"
                    itemProp="brand"
                  >
                    {deal.brand}
                  </p>
                )}

                {/* Title */}
                <h1
                  className="mt-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl"
                  itemProp="name"
                >
                  {deal.name}
                </h1>

                {/* Category & Gender tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {categoryText}
                  </span>
                  {genderTag && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {genderTag}
                    </span>
                  )}
                  {deal.brand && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {deal.brand}
                    </span>
                  )}
                </div>

                {/* Sizes */}
                {deal.sizes && deal.sizes.length > 0 && (() => {
                  // Filter sizes based on product category
                  // Check new categories array, legacy category, and URL for footwear keywords
                  const footwearCategories = ["obuca/patike", "obuca/cipele", "obuca/baletanke", "obuca/cizme", "obuca/kopacke", "obuca/sandale", "obuca/papuce"];
                  const hasFootwearCategory = deal.categories?.some(cat => footwearCategories.includes(cat));
                  const isFootwear = hasFootwearCategory ||
                    ["patike", "cipele", "cizme"].includes(deal.category) ||
                    /(patike|cipele|cizme|kopacke|sandale)[\/\-]/.test(deal.url);
                  const validClothingSizes = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];
                  const invalidSizes = ["ADULT", "PRO", "UNSZ", "BV"];

                  const filteredSizes = deal.sizes.filter((size) => {
                    // Skip obviously invalid sizes
                    if (invalidSizes.includes(size)) return false;
                    // Skip decimal junk (1.0, 5.0, etc. but allow 36.5)
                    if (/^\d\.\d$/.test(size)) return false;
                    // Allow kids age/height sizes like "2Y/92", "4Y/104"
                    if (/^\d+Y\/\d+$/.test(size)) return true;
                    // Allow shoe range sizes like "25-26", "28-29"
                    if (/^\d{2}-\d{2}$/.test(size)) return true;
                    // Allow clothing combo sizes like "S/M", "L/XL"
                    if (/^[SMLX]{1,2}\/[SMLX]{1,2}$/.test(size.toUpperCase())) return true;
                    // Skip other range sizes (like "36-37" for non-shoes or mixed formats)
                    if (size.includes("-") || size.includes("/")) return false;

                    const num = parseFloat(size);

                    if (isFootwear) {
                      // For shoes: only show numeric sizes 18-50
                      return !isNaN(num) && num >= 18 && num <= 50;
                    } else {
                      // For clothing: show letter sizes OR kids height sizes (92-176)
                      if (validClothingSizes.includes(size.toUpperCase())) return true;
                      // Kids height sizes
                      if (!isNaN(num) && num >= 92 && num <= 176) return true;
                      // Men's EU sizes (48-60)
                      if (!isNaN(num) && num >= 48 && num <= 60) return true;
                      return false;
                    }
                  });

                  // Sort sizes
                  const sortedSizes = filteredSizes.sort((a, b) => {
                    const aNum = parseFloat(a);
                    const bNum = parseFloat(b);
                    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                    const order = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];
                    return order.indexOf(a.toUpperCase()) - order.indexOf(b.toUpperCase());
                  });

                  if (sortedSizes.length === 0) return null;

                  return (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dostupne veličine:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sortedSizes.map((size) => (
                          <span
                            key={size}
                            className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Prices */}
                <div
                  className="mt-6 rounded-lg bg-white dark:bg-gray-800 p-6 shadow"
                  itemProp="offers"
                  itemScope
                  itemType="https://schema.org/Offer"
                >
                  <meta itemProp="priceCurrency" content="RSD" />
                  <meta itemProp="availability" content="https://schema.org/InStock" />
                  <div className="flex items-baseline gap-4">
                    <span
                      className="text-3xl font-bold text-red-600 dark:text-red-500"
                      itemProp="price"
                      content={String(deal.salePrice)}
                    >
                      {formatPrice(deal.salePrice)}
                    </span>
                    <span className="text-xl text-gray-400 dark:text-gray-500 line-through">
                      {formatPrice(deal.originalPrice)}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Ušteda: {formatPrice(savings)} ({deal.discountPercent}%)
                  </p>
                </div>

                {/* CTA Button */}
                <div className="mt-6">
                  <a
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-red-500 px-6 py-4 text-lg font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                  >
                    Kupi na {storeInfo.name}
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    Bićete preusmereni na sajt prodavca
                  </p>
                </div>

                {/* Share and wishlist buttons */}
                <div className="mt-6 flex gap-2">
                  <ProductWishlistButton deal={deal} />
                  <ShareButton
                    title={`${deal.name} - ${deal.discountPercent}% popust`}
                    url={`https://vrebajpopust.rs/ponuda/${deal.id}`}
                  />
                </div>
              </div>
            </div>

            {/* SEO Content Section */}
            {(() => {
              const brandInfo = getBrandInfo(deal.brand);
              return (
                <div className="mt-12 rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
                  {brandInfo ? (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        O brendu {deal.brand}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed" itemProp="description">
                        {brandInfo.description}
                      </p>
                      {brandInfo.founded && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Osnovan: {brandInfo.founded}. {brandInfo.country && `Zemlja porekla: ${brandInfo.country}.`}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
                        Ovaj <strong>{deal.brand}</strong> {deal.name.toLowerCase()} {genderText} je trenutno na akciji u prodavnici {storeInfo.name} sa popustom od <strong>{deal.discountPercent}%</strong>.
                        Originalna cena je {formatPrice(deal.originalPrice)}, a akcijska cena je samo <strong>{formatPrice(deal.salePrice)}</strong> - ušteda od {formatPrice(savings)}!
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        O proizvodu
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed" itemProp="description">
                        {deal.brand && <strong>{deal.brand}</strong>} {deal.name} {genderText} je trenutno na akciji u prodavnici {storeInfo.name} sa popustom od <strong>{deal.discountPercent}%</strong>.
                        Originalna cena ovog proizvoda je {formatPrice(deal.originalPrice)}, a akcijska cena je samo <strong>{formatPrice(deal.salePrice)}</strong>.
                        Kupovinom ovog proizvoda uštedećete {formatPrice(savings)}.
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                        VrebajPopust svakodnevno pretražuje najveće sportske prodavnice u Srbiji kako bi pronašao najveće popuste preko 50%.
                        Svi prikazani proizvodi su dostupni za kupovinu online.
                      </p>
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      {categoryText}
                    </span>
                    {genderTag && (
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {genderTag}
                      </span>
                    )}
                    {deal.brand && (
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {deal.brand}
                      </span>
                    )}
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                      {deal.discountPercent}% popust
                    </span>
                  </div>
                </div>
              );
            })()}
          </article>
        </main>

        {/* Related Deals */}
        {relatedDeals.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Slične ponude
              </h2>
              <Link
                href={`${getCategoryFilterUrl(deal)}&genders=${deal.gender}`}
                className="text-sm text-red-500 hover:underline"
              >
                Prikaži sve →
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {relatedDeals.map((relatedDeal) => (
                <div key={relatedDeal.id} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]">
                  <DealCard deal={relatedDeal} />
                </div>
              ))}
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  );
}
