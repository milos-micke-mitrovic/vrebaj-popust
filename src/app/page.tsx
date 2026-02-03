import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroBanner } from "@/components/hero-banner";
import { TopDealsCarousel } from "@/components/top-deals-carousel";
import { StoresCarousel } from "@/components/stores-carousel";
import { FAQSection } from "@/components/faq-section";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WaveText } from "@/components/wave-text";
import { getAllDealsAsync, STORE_INFO } from "@/lib/deals";
import { Store } from "@/types/deal";
import { safeJsonLd } from "@/lib/json-ld";

// Revalidate every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: "VrebajPopust | Najveći sportski popusti preko 50% u Srbiji",
  description:
    "Pronađi najveće popuste i akcije preko 50% na sportsku opremu, patike i odeću. Pratimo DjakSport, Planeta Sport, Sport Vision, N Sport, Buzz, Office Shoes i Tref Sport. Ažurirano svakodnevno.",
  keywords: [
    "popusti",
    "akcije",
    "sniženja",
    "srbija",
    "sportska oprema",
    "patike",
    "djak sport",
    "planeta sport",
    "sport vision",
    "online kupovina",
  ],
  openGraph: {
    title: "VrebajPopust | Najveći sportski popusti preko 50% u Srbiji",
    description:
      "Pronađi najveće popuste i akcije preko 50% na sportsku opremu, patike i odeću u Srbiji.",
    type: "website",
    locale: "sr_RS",
  },
};

// Round to nearest 1000 for cleaner display (e.g., 4315 → 4000)
function roundToThousand(n: number): number {
  return Math.floor(n / 1000) * 1000;
}

// Serbian grammar for "ponuda" based on number
function getPonudaForm(n: number): string {
  const lastTwo = n % 100;
  const lastOne = n % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return "ponuda";
  if (lastOne === 1) return "ponuda";
  if (lastOne >= 2 && lastOne <= 4) return "ponude";
  return "ponuda";
}

export default async function Home() {
  const deals = await getAllDealsAsync();
  const stores = Object.keys(STORE_INFO) as Store[];
  const totalDeals = deals.length;
  const displayCount = roundToThousand(totalDeals);

  // Get top 10 deals by discount for carousel
  const topDeals = [...deals]
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 10);

  // WebSite structured data
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VrebajPopust",
    description: "Pronađi najveće sportske popuste preko 50% u Srbiji",
    url: "https://www.vrebajpopust.rs",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.vrebajpopust.rs/ponude?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  // FAQ structured data - must match visible FAQSection component
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Šta je VrebajPopust?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "VrebajPopust je sajt koji prati cene u najvećim sportskim prodavnicama u Srbiji i prikazuje samo proizvode sa popustom preko 50%. Pomažemo vam da pronađete najbolje ponude bez pretrage više sajtova.",
        },
      },
      {
        "@type": "Question",
        name: "Koje prodavnice pratite?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pratimo 8 najvećih sportskih prodavnica: Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz Sneakers, Office Shoes, Intersport i Tref Sport. Svi proizvodi se ažuriraju svakodnevno.",
        },
      },
      {
        "@type": "Question",
        name: "Kako da kupim proizvod?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kada pronađete proizvod koji vam se sviđa, kliknite na dugme \"Kupi\" i bićete preusmereni direktno na sajt prodavnice gde možete završiti kupovinu po prikazanoj ceni.",
        },
      },
      {
        "@type": "Question",
        name: "Da li su cene pouzdane?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da, cene se automatski ažuriraju svakodnevno direktno sa sajtova prodavnica. Prikazujemo originalnu cenu, cenu na popustu i procenat uštede.",
        },
      },
      {
        "@type": "Question",
        name: "Mogu li sačuvati omiljene ponude?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da, kliknite na ikonu srca na bilo kom proizvodu da ga dodate u omiljene. Vaše liste se čuvaju lokalno u pretraživaču i možete im pristupiti bilo kada.",
        },
      },
      {
        "@type": "Question",
        name: "Zašto samo popusti preko 50%?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fokusiramo se na najveće uštede. Umesto da prikazujemo hiljade proizvoda sa malim popustima, biramo samo one gde stvarno možete značajno uštedeti - minimum duplo jeftinije od originalne cene.",
        },
      },
    ],
  };

  // OfferCatalog schema - shows we aggregate deals
  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "VrebajPopust - Katalog sportskih popusta",
    description: `Preko ${displayCount} proizvoda sa popustima preko 50% iz ${stores.length} sportskih prodavnica u Srbiji`,
    url: "https://www.vrebajpopust.rs/ponude",
    numberOfItems: totalDeals,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    provider: {
      "@type": "Organization",
      name: "VrebajPopust",
      url: "https://www.vrebajpopust.rs",
    },
  };

  // BreadcrumbList schema for homepage
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: "https://www.vrebajpopust.rs",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(offerCatalogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        <main>
          {/* Hero Section */}
          <HeroBanner>
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Sportski popusti
              <br />
              <WaveText text="preko 50%" />
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-200 sm:text-xl">
              Svakodnevno pretražujemo najveće sportske prodavnice u Srbiji i
              pronalazimo najveće popuste za tebe. Uštedi vreme i novac.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/ponude"
                className="rounded-lg bg-red-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-red-700 transition-colors animate-gradient-border"
              >
                Pregledaj {totalDeals} {getPonudaForm(totalDeals)}
              </Link>
            </div>
          </div>
        </HeroBanner>

        {/* Top Deals Carousel */}
        <TopDealsCarousel deals={topDeals} />

        {/* Stores Carousel */}
        <ScrollReveal>
          <StoresCarousel stores={stores} />
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal>
          <FAQSection />
        </ScrollReveal>

        {/* CTA */}
        <section className="bg-gray-900 dark:bg-gray-950 py-16">
          <ScrollReveal>
            <div className="mx-auto max-w-7xl px-4 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Spreman da uštediš?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-300">
                Pregledaj sve aktivne ponude i pronađi savršen proizvod po
                sniženoj ceni.
              </p>
              <Link
                href="/ponude"
                className="mt-8 inline-block rounded-lg bg-red-500 px-8 py-4 text-lg font-semibold text-white hover:bg-red-600 transition-colors animate-gradient-border"
              >
                Pregledaj ponude
              </Link>
            </div>
          </ScrollReveal>
        </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
