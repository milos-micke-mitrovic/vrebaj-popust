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
import { getAllDealsAsync } from "@/lib/deals";
import { Store } from "@/types/deal";

// Revalidate every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: "VrebajPopust | Najveći sportski popusti preko 50% u Srbiji",
  description:
    "Pronađi najveće popuste i akcije preko 50% na sportsku opremu, patike i odeću. Pratimo DjakSport, Planeta Sport, Sport Vision, N Sport, Buzz i Office Shoes. Ažurirano svakodnevno.",
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
  const stores = [...new Set(deals.map((d) => d.store))] as Store[];
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
    url: "https://vrebajpopust.rs",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://vrebajpopust.rs/ponude?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  // FAQ structured data for AI search optimization
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Gde mogu da pronađem najveće popuste na patike u Srbiji?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Na VrebajPopust.rs možete pronaći patike sa popustom preko 50% iz svih velikih sportskih prodavnica u Srbiji. Pratimo Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz Sneakers, Office Shoes i Intersport. Sve ponude se ažuriraju svakodnevno.",
        },
      },
      {
        "@type": "Question",
        name: "Koje sportske prodavnice VrebajPopust prati?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "VrebajPopust prati 7 najvećih sportskih prodavnica u Srbiji: Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz Sneakers, Office Shoes i Intersport. Skeniramo njihove sajtove svakodnevno i prikazujemo samo proizvode sa popustom preko 50%.",
        },
      },
      {
        "@type": "Question",
        name: "Koje brendove mogu da pronađem na VrebajPopust?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Na VrebajPopust možete pronaći sve velike sportske brendove: Nike, Adidas, Puma, New Balance, Reebok, Converse, Vans, ASICS, Under Armour, Fila, Champion, The North Face, Skechers, Jordan i mnoge druge. Svi proizvodi imaju popust od minimum 50%.",
        },
      },
      {
        "@type": "Question",
        name: "Koliko često se ažuriraju ponude na VrebajPopust?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ponude na VrebajPopust se ažuriraju svakodnevno. Naši automatski skeneri pretražuju sve prodavnice svakih 24 sata kako bismo vam prikazali najnovije popuste preko 50%.",
        },
      },
      {
        "@type": "Question",
        name: "Da li je kupovina preko VrebajPopust sigurna?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "VrebajPopust je agregator ponuda - mi samo prikazujemo proizvode na popustu. Kupovina se vrši direktno na sajtu prodavnice (Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz ili Office Shoes) koje su proverene i pouzdane kompanije sa dugogodišnjim iskustvom na srpskom tržištu.",
        },
      },
      {
        "@type": "Question",
        name: "Koji je minimalni popust na VrebajPopust?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Prikazujemo isključivo proizvode sa popustom od 50% ili više. To znači da svaki proizvod na našem sajtu ima bar duplo nižu cenu od originalne. Prosečan popust je oko 60%.",
        },
      },
      {
        "@type": "Question",
        name: "Kako da pronađem patike na popustu?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Na VrebajPopust možete lako pronaći patike na popustu koristeći filtere. Idite na stranicu 'Sve ponude' i izaberite kategoriju 'Patike'. Možete dodatno filtrirati po brendu (Nike, Adidas, Puma...), polu i ceni.",
        },
      },
      {
        "@type": "Question",
        name: "Da li VrebajPopust ima mobilnu aplikaciju?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "VrebajPopust je progresivna web aplikacija (PWA) koju možete instalirati na telefon direktno iz pretraživača. Radi kao nativna aplikacija bez potrebe za preuzimanjem iz prodavnice aplikacija.",
        },
      },
      {
        "@type": "Question",
        name: "Kako da sačuvam omiljene ponude?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kliknite na ikonu srca na bilo kom proizvodu da ga dodate u omiljene. Vaše omiljene ponude se čuvaju lokalno u pretraživaču i možete im pristupiti klikom na ikonu srca u gornjem desnom uglu.",
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalogSchema) }}
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
