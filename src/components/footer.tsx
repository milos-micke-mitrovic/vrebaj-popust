import Link from "next/link";
import Image from "next/image";

const STORES = [
  { name: "Djak Sport", logo: "/logos/djaksport.png", slug: "djak-sport" },
  { name: "Planeta Sport", logo: "/logos/planeta.png", slug: "planeta-sport" },
  { name: "Sport Vision", logo: "/logos/sportvision.png", slug: "sport-vision" },
  { name: "N Sport", logo: "/logos/nsport.jpg", slug: "n-sport" },
  { name: "Buzz", logo: "/logos/buzz.png", slug: "buzz" },
  { name: "Office Shoes", logo: "/logos/officeshoes.png", slug: "office-shoes" },
  { name: "Intersport", logo: "/logos/intersport.jpg", slug: "intersport" },
  { name: "Tref Sport", logo: "/logos/trefsport.png", slug: "tref-sport" },
];

export function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Main footer content */}
        <div className="flex flex-wrap justify-between gap-8">
          {/* Logo and description */}
          <div className="w-full sm:w-auto sm:max-w-[280px]">
            <Link href="/" className="group flex items-center gap-1.5">
              <Image src="/logos/logo.png" alt="" width={40} height={40} className="h-10 w-10" />
              <span className="text-xl font-bold">
                <span className="text-gray-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-500 transition-colors duration-300">Vrebaj</span>
                <span className="text-red-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">Popust</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Pronađi najveće sportske popuste preko 50% u Srbiji.
              Ažuriramo ponude svakodnevno.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Linkovi</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Početna
                </Link>
              </li>
              <li>
                <Link href="/ponude" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Sve ponude
                </Link>
              </li>
              <li>
                <Link href="/o-nama" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  O nama
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Kategorije</h3>
            <div className="mt-3 flex gap-4 text-sm">
              <ul className="space-y-2">
                <li>
                  <Link href="/ponude/patike" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Patike
                  </Link>
                </li>
                <li>
                  <Link href="/ponude/cipele" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Cipele
                  </Link>
                </li>
                <li>
                  <Link href="/ponude/jakne" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Jakne
                  </Link>
                </li>
              </ul>
              <ul className="space-y-2">
                <li>
                  <Link href="/ponude/duksevi" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Duksevi
                  </Link>
                </li>
                <li>
                  <Link href="/ponude/trenerke" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Trenerke
                  </Link>
                </li>
                <li>
                  <Link href="/ponude/majice" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                    Majice
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Stores we track */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Pratimo prodavnice</h3>
            <div className="mt-3 flex flex-wrap gap-3 max-w-[200px]">
              {STORES.map((store) => (
                <Link
                  key={store.name}
                  href={`/ponude/${store.slug}`}
                  title={`Pogledaj ponude - ${store.name}`}
                >
                  <Image
                    src={store.logo}
                    alt={store.name}
                    width={60}
                    height={24}
                    style={{ height: '24px', width: 'auto' }}
                    className="grayscale hover:grayscale-0 transition-all dark:brightness-90 dark:hover:brightness-100"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t dark:border-gray-800 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} VrebajPopust. Sva prava zadržana.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/privatnost" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                Privatnost
              </Link>
              <Link href="/uslovi" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                Uslovi korišćenja
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            Cene se ažuriraju automatski. VrebajPopust nije odgovoran za tačnost cena na sajtovima prodavaca.
          </p>
        </div>
      </div>
    </footer>
  );
}
