import { Metadata } from "next";
import Link from "next/link";
import { getDealById, getAllDealIds, getRelatedDeals, getTopDeals, STORE_INFO } from "@/lib/deals";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StoreLogo } from "@/components/store-logo";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DealCard } from "@/components/deal-card";
import { ShareButton } from "@/components/share-button";
import { ProductWishlistButton } from "@/components/product-wishlist-button";
import { ProductImage } from "@/components/product-image";

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

const GENDER_TAGS: Record<string, string> = {
  men: "Muškarci",
  women: "Žene",
  kids: "Deca",
  unisex: "",
};

const GENDER_TEXT: Record<string, string> = {
  men: "za muškarce",
  women: "za žene",
  kids: "za decu",
  unisex: "",
};

// Generate static paths for all deals
export async function generateStaticParams() {
  const ids = getAllDealIds();
  return ids.map((id) => ({ id }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const deal = getDealById(id);

  if (!deal) {
    return {
      title: "Ponuda više nije dostupna | VrebajPopust",
      description: "Ova ponuda više nije dostupna. Pogledajte druge aktuelne popuste preko 50% na sportsku opremu u Srbiji.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const storeInfo = STORE_INFO[deal.store];
  const genderText = GENDER_TEXT[deal.gender] || "";
  const categoryText = CATEGORY_NAMES[deal.category] || "";

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
      index: true,
      follow: true,
    },
  };
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const deal = getDealById(id);

  // Product not available - show friendly page with alternatives
  if (!deal) {
    const topDeals = getTopDeals(8);

    return (
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
              Ova ponuda više nije dostupna
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Proizvod je možda rasprodat ili je popust istekao.
              Pogledajte druge aktuelne ponude sa popustima preko 50%.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/ponude"
                className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 transition-colors"
              >
                Pregledaj sve ponude
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Početna stranica
              </Link>
            </div>
          </div>

          {/* Top Deals Section */}
          {topDeals.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Najpopularnije ponude
              </h2>
              <div className="flex flex-wrap gap-3">
                {topDeals.map((topDeal) => (
                  <div key={topDeal.id} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]">
                    <DealCard deal={topDeal} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    );
  }

  const storeInfo = STORE_INFO[deal.store];
  const savings = deal.originalPrice - deal.salePrice;
  const categoryText = CATEGORY_NAMES[deal.category] || "Proizvod";
  const genderText = GENDER_TEXT[deal.gender] || "";
  const genderTag = GENDER_TAGS[deal.gender] || "";
  const relatedDeals = getRelatedDeals(deal, 8);

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

  // Product structured data - enhanced for better SEO
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.name,
    image: imageUrl,
    description: `${deal.brand || ""} ${categoryText} ${genderText} sa ${deal.discountPercent}% popusta. Originalna cena ${formatPrice(deal.originalPrice)}, sada samo ${formatPrice(deal.salePrice)}. Dostupno u ${storeInfo.name}.`.trim(),
    sku: deal.id,
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
      priceSpecification: {
        "@type": "PriceSpecification",
        price: deal.salePrice,
        priceCurrency: "RSD",
        valueAddedTaxIncluded: true,
      },
    },
  };

  // Aggregate offer to show price drop
  const aggregateOfferSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.name,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: deal.salePrice,
      highPrice: deal.originalPrice,
      priceCurrency: "RSD",
      offerCount: 1,
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
        item: `https://vrebajpopust.rs/ponude?category=${deal.category}`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateOfferSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />

        {/* Breadcrumb */}
        <nav
          className="mx-auto max-w-7xl px-4 py-4"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/ponude" className="hover:text-red-500">
                Ponude
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li>
              <Link href={`/ponude?categories=${deal.category}`} className="hover:text-red-500">
                {categoryText}
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li className="flex items-center">
              <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                {deal.name}
              </span>
            </li>
          </ol>
        </nav>

        {/* Product Details */}
        <main className="mx-auto max-w-7xl px-4 pb-12">
          <article itemScope itemType="https://schema.org/Product">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
                {deal.imageUrl ? (
                  <ProductImage
                    src={deal.imageUrl}
                    alt={`${deal.name} - ${deal.brand || ""} ${categoryText}`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                    Nema slike
                  </div>
                )}
                <Badge className="absolute left-4 top-4 bg-red-500 px-3 py-1 text-lg text-white">
                  -{deal.discountPercent}%
                </Badge>
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
                  <p className="mt-2 text-green-600 dark:text-green-500 font-medium">
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
                </div>

                <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Bićete preusmereni na sajt prodavca
                </p>

                {/* Share and wishlist buttons */}
                <div className="mt-4 flex justify-center gap-2">
                  <ProductWishlistButton deal={deal} />
                  <ShareButton
                    title={`${deal.name} - ${deal.discountPercent}% popust`}
                    url={`https://vrebajpopust.rs/ponuda/${deal.id}`}
                  />
                </div>
              </div>
            </div>

            {/* SEO Content Section */}
            <div className="mt-12 rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
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
                href={`/ponude?categories=${deal.category}&genders=${deal.gender}`}
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
