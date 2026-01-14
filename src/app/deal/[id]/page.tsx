import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDealById, getAllDealIds, STORE_INFO } from "@/lib/deals";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreLogo } from "@/components/store-logo";
import { BackButton } from "@/components/back-button";
import { Header } from "@/components/header";

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

const GENDER_NAMES: Record<string, string> = {
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
    return { title: "Proizvod nije pronađen" };
  }

  const storeInfo = STORE_INFO[deal.store];
  const genderText = GENDER_NAMES[deal.gender] || "";
  const categoryText = CATEGORY_NAMES[deal.category] || "";

  const title = `${deal.name} - ${deal.discountPercent}% popust`;
  const description = `${deal.brand || ""} ${categoryText} ${genderText} na akciji u ${storeInfo.name}. Stara cena: ${formatPrice(deal.originalPrice)}, nova cena: ${formatPrice(deal.salePrice)}. Uštedi ${formatPrice(deal.originalPrice - deal.salePrice)}!`.trim();

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
      `${deal.discountPercent}% popust`,
    ].filter(Boolean) as string[],
    openGraph: {
      title: `${deal.name} - ${deal.discountPercent}% POPUST`,
      description,
      url: `https://vrebajpopust.rs/deal/${id}`,
      siteName: "VrebajPopust",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: deal.name,
            },
          ]
        : [],
      type: "website",
      locale: "sr_RS",
    },
    twitter: {
      card: "summary_large_image",
      title: `${deal.name} - ${deal.discountPercent}% POPUST`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: `https://vrebajpopust.rs/deal/${id}`,
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

  if (!deal) {
    notFound();
  }

  const storeInfo = STORE_INFO[deal.store];
  const savings = deal.originalPrice - deal.salePrice;
  const categoryText = CATEGORY_NAMES[deal.category] || "Proizvod";
  const genderText = GENDER_NAMES[deal.gender] || "";

  const imageUrl = deal.imageUrl?.startsWith("/")
    ? `https://vrebajpopust.rs${deal.imageUrl}`
    : deal.imageUrl;

  // Product structured data
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.name,
    image: imageUrl,
    description: `${deal.name} ${genderText} na akciji sa ${deal.discountPercent}% popusta u ${storeInfo.name}`,
    sku: deal.id,
    brand: deal.brand
      ? {
          "@type": "Brand",
          name: deal.brand,
        }
      : undefined,
    category: categoryText,
    offers: {
      "@type": "Offer",
      url: `https://vrebajpopust.rs/deal/${deal.id}`,
      price: deal.salePrice,
      priceCurrency: "RSD",
      availability: "https://schema.org/InStock",
      priceValidUntil: priceValidUntilDate,
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
        item: `https://vrebajpopust.rs/ponude?category=${deal.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: deal.name,
        item: `https://vrebajpopust.rs/deal/${deal.id}`,
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

      <div className="min-h-screen bg-gray-50">
        <Header />

        {/* Breadcrumb with Back Button */}
        <nav
          className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center text-sm text-gray-500">
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
            <li>
              <span className="text-gray-900 font-medium truncate max-w-[200px] inline-block">
                {deal.name}
              </span>
            </li>
          </ol>
          <BackButton />
        </nav>

        {/* Product Details */}
        <main className="mx-auto max-w-7xl px-4 pb-12">
          <article itemScope itemType="https://schema.org/Product">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white shadow">
                {deal.imageUrl ? (
                  <img
                    src={deal.imageUrl}
                    alt={`${deal.name} - ${deal.brand || ""} ${categoryText}`}
                    className="h-full w-full object-contain p-4"
                    itemProp="image"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
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
                  />
                </div>

                {/* Brand */}
                {deal.brand && (
                  <p
                    className="text-sm font-medium uppercase text-gray-500"
                    itemProp="brand"
                  >
                    {deal.brand}
                  </p>
                )}

                {/* Title */}
                <h1
                  className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl"
                  itemProp="name"
                >
                  {deal.name}
                </h1>

                {/* Category & Gender tags */}
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline">{categoryText}</Badge>
                  {genderText && <Badge variant="outline">{genderText}</Badge>}
                </div>

                {/* Prices */}
                <div
                  className="mt-6 rounded-lg bg-white p-6 shadow"
                  itemProp="offers"
                  itemScope
                  itemType="https://schema.org/Offer"
                >
                  <meta itemProp="priceCurrency" content="RSD" />
                  <meta itemProp="availability" content="https://schema.org/InStock" />
                  <div className="flex items-baseline gap-4">
                    <span
                      className="text-3xl font-bold text-red-600"
                      itemProp="price"
                      content={String(deal.salePrice)}
                    >
                      {formatPrice(deal.salePrice)}
                    </span>
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(deal.originalPrice)}
                    </span>
                  </div>
                  <p className="mt-2 text-green-600 font-medium">
                    Ušteda: {formatPrice(savings)} ({deal.discountPercent}%)
                  </p>
                </div>

                {/* CTA Button */}
                <div className="mt-6">
                  <Button asChild size="lg" className="w-full text-lg">
                    <a
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
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
                  </Button>
                </div>

                <p className="mt-4 text-center text-sm text-gray-500">
                  Bićete preusmereni na sajt prodavca
                </p>
              </div>
            </div>
          </article>
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
              <Link
                href="/ponude"
                className="text-sm text-red-500 hover:underline"
              >
                ← Nazad na sve ponude
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
