import Link from "next/link";

const BRANDS = [
  { slug: "nike", label: "Nike" },
  { slug: "adidas", label: "Adidas" },
  { slug: "puma", label: "Puma" },
  { slug: "new-balance", label: "New Balance" },
  { slug: "under-armour", label: "Under Armour" },
  { slug: "the-north-face", label: "The North Face" },
  { slug: "jordan", label: "Jordan" },
  { slug: "reebok", label: "Reebok" },
  { slug: "converse", label: "Converse" },
  { slug: "columbia", label: "Columbia" },
];

const CATEGORIES = [
  { slug: "patike", label: "Patike" },
  { slug: "jakne", label: "Jakne" },
  { slug: "duksevi", label: "Duksevi" },
  { slug: "trenerke", label: "Trenerke" },
  { slug: "majice", label: "Majice" },
  { slug: "cizme", label: "Čizme" },
  { slug: "helanke", label: "Helanke" },
  { slug: "sorcevi", label: "Šorcevi" },
];

const COMBOS = [
  { slug: "nike-patike", label: "Nike patike" },
  { slug: "adidas-patike", label: "Adidas patike" },
  { slug: "nike-duksevi", label: "Nike duksevi" },
  { slug: "adidas-jakne", label: "Adidas jakne" },
  { slug: "muski-patike", label: "Muške patike" },
  { slug: "zenski-patike", label: "Ženske patike" },
];

export function PopularCategories() {
  return (
    <section className="bg-white dark:bg-gray-900 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Popularne kategorije
        </h2>

        <div className="space-y-8">
          {/* Brands */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Brendovi
            </h3>
            <div className="flex flex-wrap gap-2">
              {BRANDS.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/ponude/${brand.slug}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                >
                  {brand.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Kategorije
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/ponude/${cat.slug}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Combinations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Popularne pretrage
            </h3>
            <div className="flex flex-wrap gap-2">
              {COMBOS.map((combo) => (
                <Link
                  key={combo.slug}
                  href={`/ponude/${combo.slug}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                >
                  {combo.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
