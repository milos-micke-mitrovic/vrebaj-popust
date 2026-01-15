import Link from "next/link";
import Image from "next/image";

const STORES = [
  { name: "Djak Sport", logo: "/logos/djaksport.png" },
  { name: "Planeta Sport", logo: "/logos/planeta.png" },
  { name: "Sport Vision", logo: "/logos/sportvision.png" },
  { name: "N Sport", logo: "/logos/nsport.jpg" },
  { name: "Buzz Sneakers", logo: "/logos/buzz.png" },
  { name: "Office Shoes", logo: "/logos/officeshoes.png" },
];

export function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Main footer content */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo and description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logos/logo.png" alt="VrebajPopust" width={40} height={40} className="h-10 w-10" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Vrebaj<span className="text-red-500">Popust</span>
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
              <li>
                <Link href="/privatnost" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Privatnost
                </Link>
              </li>
              <li>
                <Link href="/uslovi" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Uslovi korišćenja
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Kategorije</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/ponude?categories=patike" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Patike
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=jakna" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Jakne
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=duks" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Duksevi
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=majica" className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  Majice
                </Link>
              </li>
            </ul>
          </div>

          {/* Stores we track */}
          <div className="lg:w-fit">
            <h3 className="font-semibold text-gray-900 dark:text-white">Pratimo prodavnice</h3>
            <div className="mt-3 flex flex-wrap gap-3 lg:max-w-[160px]">
              {STORES.map((store) => (
                <Image
                  key={store.name}
                  src={store.logo}
                  alt={store.name}
                  title={store.name}
                  width={60}
                  height={24}
                  style={{ height: '24px', width: 'auto' }}
                  className="grayscale hover:grayscale-0 transition-all dark:brightness-90 dark:hover:brightness-100"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Cene se ažuriraju automatski. VrebajPopust nije odgovoran za tačnost cena na sajtovima prodavaca.
          </p>
        </div>
      </div>
    </footer>
  );
}
