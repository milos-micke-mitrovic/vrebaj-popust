import Link from "next/link";

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
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Main footer content */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo and description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logos/logo.png" alt="VrebajPopust" className="h-10 w-10" />
              <span className="text-xl font-bold text-gray-900">
                Vrebaj<span className="text-red-500">Popust</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-600">
              Pronađi najbolje sportske popuste preko 50% u Srbiji.
              Ažuriramo ponude svakodnevno.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-gray-900">Linkovi</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-red-500">
                  Početna
                </Link>
              </li>
              <li>
                <Link href="/ponude" className="text-gray-600 hover:text-red-500">
                  Sve ponude
                </Link>
              </li>
              <li>
                <Link href="/o-nama" className="text-gray-600 hover:text-red-500">
                  O nama
                </Link>
              </li>
              <li>
                <Link href="/privatnost" className="text-gray-600 hover:text-red-500">
                  Privatnost
                </Link>
              </li>
              <li>
                <Link href="/uslovi" className="text-gray-600 hover:text-red-500">
                  Uslovi korišćenja
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gray-900">Kategorije</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/ponude?categories=patike" className="text-gray-600 hover:text-red-500">
                  Patike
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=jakna" className="text-gray-600 hover:text-red-500">
                  Jakne
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=duks" className="text-gray-600 hover:text-red-500">
                  Duksevi
                </Link>
              </li>
              <li>
                <Link href="/ponude?categories=majica" className="text-gray-600 hover:text-red-500">
                  Majice
                </Link>
              </li>
            </ul>
          </div>

          {/* Stores we track */}
          <div>
            <h3 className="font-semibold text-gray-900">Pratimo prodavnice</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {STORES.map((store) => (
                <img
                  key={store.name}
                  src={store.logo}
                  alt={store.name}
                  title={store.name}
                  className="h-6 w-auto grayscale hover:grayscale-0 transition-all"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t pt-6">
          <p className="text-xs text-gray-400 text-center">
            Cene se ažuriraju automatski. VrebajPopust nije odgovoran za tačnost cena na sajtovima prodavaca.
          </p>
        </div>
      </div>
    </footer>
  );
}
