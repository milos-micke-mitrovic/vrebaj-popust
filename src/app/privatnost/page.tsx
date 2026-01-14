import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Politika privatnosti | VrebajPopust",
  description:
    "Politika privatnosti sajta VrebajPopust - kako prikupljamo i koristimo vaše podatke.",
  openGraph: {
    title: "Politika privatnosti | VrebajPopust",
    description: "Politika privatnosti sajta VrebajPopust.",
    type: "website",
    locale: "sr_RS",
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <article className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Politika privatnosti
          </h1>

          <div className="prose prose-gray max-w-none text-gray-600">
            <p className="mb-4">
              Poslednje ažuriranje: {new Date().toLocaleDateString("sr-RS")}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Uvod
            </h2>
            <p className="mb-4">
              VrebajPopust poštuje vašu privatnost. Ova politika privatnosti
              objašnjava kako prikupljamo, koristimo i štitimo informacije kada
              posetite naš sajt.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Podaci koje prikupljamo
            </h2>
            <p className="mb-4">
              VrebajPopust ne zahteva registraciju niti prikuplja lične podatke
              poput imena, email adrese ili broja telefona. Međutim, automatski
              prikupljamo određene tehničke podatke:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>IP adresa (anonimizovana)</li>
              <li>Tip pretraživača i uređaja</li>
              <li>Stranice koje posećujete na našem sajtu</li>
              <li>Vreme i datum posete</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Google Analytics
            </h2>
            <p className="mb-4">
              Koristimo Google Analytics za analizu posećenosti sajta. Google
              Analytics koristi kolačiće za prikupljanje anonimnih statističkih
              podataka o tome kako posetioci koriste naš sajt. Ovi podaci nam
              pomažu da poboljšamo korisničko iskustvo.
            </p>
            <p className="mb-4">
              Možete onemogućiti Google Analytics kolačiće putem podešavanja
              vašeg pretraživača ili instaliranjem{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-600"
              >
                Google Analytics Opt-out dodatka
              </a>
              .
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Kolačići
            </h2>
            <p className="mb-4">
              Naš sajt koristi kolačiće za analitiku. Kolačići su male tekstualne
              datoteke koje se čuvaju na vašem uređaju. Možete ih obrisati ili
              blokirati putem podešavanja pretraživača.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Linkovi ka drugim sajtovima
            </h2>
            <p className="mb-4">
              Naš sajt sadrži linkove ka sajtovima prodavnica (Djak Sport, Planeta
              Sport, Sport Vision, itd.). Kada kliknete na proizvod, bićete
              preusmereni na sajt prodavnice koja ima sopstvenu politiku
              privatnosti. Nismo odgovorni za sadržaj ili prakse privatnosti tih
              sajtova.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Vaša prava
            </h2>
            <p className="mb-4">Imate pravo da:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Zatražite informacije o podacima koje imamo o vama</li>
              <li>Zatražite brisanje vaših podataka</li>
              <li>Onemogućite kolačiće putem podešavanja pretraživača</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Kontakt
            </h2>
            <p className="mb-4">
              Za sva pitanja vezana za privatnost, kontaktirajte nas na{" "}
              <a
                href="mailto:info@vrebajpopust.rs"
                className="text-red-500 hover:text-red-600"
              >
                info@vrebajpopust.rs
              </a>
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Izmene politike
            </h2>
            <p>
              Zadržavamo pravo da ažuriramo ovu politiku privatnosti u bilo kom
              trenutku. Sve izmene će biti objavljene na ovoj stranici.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
