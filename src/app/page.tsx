import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroBanner } from "@/components/hero-banner";
import { getAllDealsAsync, STORE_INFO } from "@/lib/deals";
import { Store } from "@/types/deal";

// Revalidate every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: "VrebajPopust | Najveći sportski popusti preko 50% u Srbiji",
  description:
    "Pronađi najveće popuste preko 50% na sportsku opremu, patike i odeću. Pratimo DjakSport, Planeta Sport, Sport Vision, N Sport, Buzz i Office Shoes. Ažurirano svakodnevno.",
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
      "Pronađi najveće popuste preko 50% na sportsku opremu, patike i odeću u Srbiji.",
    type: "website",
    locale: "sr_RS",
  },
};

// Round to nearest 1000 for cleaner display (e.g., 4315 → 4000)
function roundToThousand(n: number): number {
  return Math.floor(n / 1000) * 1000;
}

export default async function Home() {
  const deals = await getAllDealsAsync();
  const stores = [...new Set(deals.map((d) => d.store))] as Store[];
  const totalDeals = deals.length;
  const displayCount = roundToThousand(totalDeals);
  const avgDiscount = Math.round(
    deals.reduce((sum, d) => sum + d.discountPercent, 0) / deals.length
  );

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        {/* Hero Section */}
        <HeroBanner>
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Sportski popusti
              <br />
              <span className="text-red-400">preko 50%</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-200 sm:text-xl">
              Svakodnevno pretražujemo najveće sportske prodavnice u Srbiji i
              pronalazimo najveće popuste za tebe. Uštedi vreme i novac.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/ponude"
                className="rounded-lg bg-red-500 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-red-600 transition-colors"
              >
                Pregledaj {totalDeals} ponuda
              </Link>
            </div>
          </div>
        </HeroBanner>

        {/* Stats Section */}
        <section className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 sm:text-4xl">
                  {displayCount}+
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Aktivnih ponuda</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 sm:text-4xl">
                  {stores.length}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Prodavnica</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 sm:text-4xl">
                  {avgDiscount}%
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Prosečan popust</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 sm:text-4xl">
                  24h
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Ažuriranje</div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Kako funkcioniše?
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-2xl dark:text-red-400">
                  1
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Pretražujemo prodavnice
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Automatski skeniramo najveće sportske prodavnice u Srbiji svaki
                  dan.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-2xl dark:text-red-400">
                  2
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Filtriramo popuste
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Prikazujemo samo proizvode sa popustom preko 50% - prave
                  uštede.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-2xl dark:text-red-400">
                  3
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Ti uštediš
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Pronađi savršenu ponudu i kupi direktno u prodavnici po
                  sniženoj ceni.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stores we track */}
        <section className="border-t bg-white dark:bg-gray-900 dark:border-gray-800 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Prodavnice koje pratimo
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-6">
              {stores.map((store) => {
                const info = STORE_INFO[store];
                return (
                  <div
                    key={store}
                    className="flex flex-col items-center gap-2"
                  >
                    <Image
                      src={info.logo}
                      alt={info.name}
                      width={96}
                      height={48}
                      style={{ height: '48px', width: 'auto' }}
                      className="object-contain grayscale hover:grayscale-0 transition-all dark:brightness-90 dark:hover:brightness-100"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{info.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 dark:bg-gray-800 py-16">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Spreman da uštediš?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Pregledaj sve aktivne ponude i pronađi savršen proizvod po
              sniženoj ceni.
            </p>
            <Link
              href="/ponude"
              className="mt-8 inline-block rounded-lg bg-red-500 px-8 py-4 text-lg font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Pregledaj ponude
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
