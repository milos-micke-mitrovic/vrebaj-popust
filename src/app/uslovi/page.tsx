import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Uslovi korišćenja | VrebajPopust",
  description:
    "Uslovi korišćenja sajta VrebajPopust - pravila i odgovornosti pri korišćenju našeg servisa.",
  openGraph: {
    title: "Uslovi korišćenja | VrebajPopust",
    description: "Uslovi korišćenja sajta VrebajPopust.",
    type: "website",
    locale: "sr_RS",
  },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <article className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Uslovi korišćenja
          </h1>

          <div className="prose prose-gray max-w-none text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              Poslednje ažuriranje: {new Date().toLocaleDateString("sr-RS")}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Prihvatanje uslova
            </h2>
            <p className="mb-4">
              Korišćenjem sajta VrebajPopust prihvatate ove uslove korišćenja. Ako
              se ne slažete sa ovim uslovima, molimo vas da ne koristite naš sajt.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Opis servisa
            </h2>
            <p className="mb-4">
              VrebajPopust je agregator popusta koji prikazuje proizvode sa
              popustima iz različitih online prodavnica. Mi ne prodajemo proizvode
              direktno - samo prikazujemo informacije o ponudama dostupnim u
              drugim prodavnicama.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Ograničenje odgovornosti
            </h2>
            <p className="mb-4">VrebajPopust:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                Ne garantuje tačnost, potpunost ili ažurnost prikazanih
                informacija o proizvodima
              </li>
              <li>
                Nije odgovoran za cene, dostupnost ili kvalitet proizvoda u
                prodavnicama
              </li>
              <li>
                Nije strana u transakcijama između vas i prodavnica
              </li>
              <li>
                Ne preuzima odgovornost za bilo kakvu štetu nastalu korišćenjem
                sajta
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Cene i dostupnost
            </h2>
            <p className="mb-4">
              Cene i dostupnost proizvoda prikazanih na našem sajtu mogu se
              razlikovati od aktuelnih cena u prodavnicama. Uvek proverite
              konačnu cenu i dostupnost na sajtu prodavnice pre kupovine.
              Popusti se računaju automatski na osnovu podataka sa sajtova
              prodavnica i mogu sadržati greške.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Intelektualna svojina
            </h2>
            <p className="mb-4">
              Slike proizvoda i opisi su vlasništvo odgovarajućih prodavnica i
              brendova. VrebajPopust ih prikazuje isključivo u informativne svrhe.
              Logo i dizajn sajta VrebajPopust su naša intelektualna svojina.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Linkovi ka trećim stranama
            </h2>
            <p className="mb-4">
              Naš sajt sadrži linkove ka sajtovima prodavnica. Klikom na proizvod
              napuštate naš sajt. Nismo odgovorni za sadržaj, politike privatnosti
              ili prakse tih sajtova.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Zabranjeno korišćenje
            </h2>
            <p className="mb-4">Zabranjeno je:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                Automatsko prikupljanje podataka sa sajta (scraping) bez dozvole
              </li>
              <li>
                Korišćenje sajta na način koji može oštetiti, onemogućiti ili
                preopteretiti naše servere
              </li>
              <li>
                Pokušaj neovlašćenog pristupa našim sistemima
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Izmene uslova
            </h2>
            <p className="mb-4">
              Zadržavamo pravo da izmenimo ove uslove u bilo kom trenutku.
              Nastavak korišćenja sajta nakon izmena predstavlja prihvatanje novih
              uslova.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Kontakt
            </h2>
            <p>
              Kontakt email za pitanja o uslovima korišćenja je trenutno u pripremi.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
