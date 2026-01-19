import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getAllDeals, getUniqueStores } from "@/lib/deals";

export const metadata: Metadata = {
  title: "O nama | VrebajPopust",
  description:
    "VrebajPopust svakodnevno pretražuje najveće sportske prodavnice u Srbiji i pronalazi proizvode sa popustima preko 50%.",
  openGraph: {
    title: "O nama | VrebajPopust",
    description:
      "Saznaj više o VrebajPopust - sajtu za praćenje sportskih popusta u Srbiji.",
    type: "website",
    locale: "sr_RS",
  },
  alternates: {
    canonical: "https://www.vrebajpopust.rs/o-nama",
  },
};

export default function AboutPage() {
  const deals = getAllDeals();
  const stores = getUniqueStores();

  // AboutPage structured data
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "O nama - VrebajPopust",
    description: "VrebajPopust svakodnevno pretražuje najveće sportske prodavnice u Srbiji i pronalazi proizvode sa popustima preko 50%.",
    url: "https://www.vrebajpopust.rs/o-nama",
    mainEntity: {
      "@type": "Organization",
      name: "VrebajPopust",
      url: "https://www.vrebajpopust.rs",
      description: "Agregator sportskih popusta u Srbiji",
      foundingDate: "2024",
      areaServed: {
        "@type": "Country",
        name: "Serbia",
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
        name: "Početna",
        item: "https://www.vrebajpopust.rs",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "O nama",
        item: "https://www.vrebajpopust.rs/o-nama",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <article className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">O nama</h1>

          <div className="prose prose-gray max-w-none dark:prose-invert">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              <strong>VrebajPopust</strong> je besplatan sajt koji pomaže
              kupcima u Srbiji da pronađu najveće popuste na sportsku opremu,
              obuću i odeću.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Kako funkcionišemo?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Naš sistem svakodnevno automatski pretražuje {stores.length} najvećih
              sportskih prodavnica u Srbiji i pronalazi proizvode sa popustima
              preko 50%. Trenutno pratimo preko {deals.length} aktivnih ponuda.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Zašto VrebajPopust?
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 mb-4">
              <li>Ušteda vremena - sve ponude na jednom mestu</li>
              <li>Samo pravi popusti - minimum 50% sniženja</li>
              <li>Svakodnevno ažuriranje - uvek sveže ponude</li>
              <li>Besplatno - bez registracije i skrivenih troškova</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Napomena
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              VrebajPopust nije prodavnica - mi samo prikupljamo i prikazujemo
              ponude iz drugih prodavnica. Sve kupovine se obavljaju direktno na
              sajtovima prodavnica. Cene i dostupnost proizvoda mogu se promeniti
              bez prethodne najave.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Kontakt
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Kontakt email je trenutno u pripremi. Uskoro ćemo omogućiti direktnu komunikaciju.
            </p>
          </div>
        </article>
      </main>

        <Footer />
      </div>
    </>
  );
}
