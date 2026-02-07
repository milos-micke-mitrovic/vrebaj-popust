import Link from "next/link";

const FEATURED_BRANDS = [
  { slug: "nike", label: "Nike", color: "from-orange-500 to-red-600" },
  { slug: "adidas", label: "Adidas", color: "from-blue-600 to-indigo-700" },
  { slug: "puma", label: "Puma", color: "from-red-500 to-pink-600" },
  { slug: "new-balance", label: "New Balance", color: "from-gray-600 to-gray-800" },
];

const OTHER_BRANDS = [
  { slug: "under-armour", label: "Under Armour" },
  { slug: "the-north-face", label: "The North Face" },
  { slug: "jordan", label: "Jordan" },
  { slug: "reebok", label: "Reebok" },
  { slug: "converse", label: "Converse" },
  { slug: "columbia", label: "Columbia" },
  { slug: "vans", label: "Vans" },
  { slug: "hoka", label: "Hoka" },
];

const CATEGORIES = [
  { slug: "patike", label: "Patike", icon: "👟" },
  { slug: "jakne", label: "Jakne", icon: "🧥" },
  { slug: "duksevi", label: "Duksevi", icon: "👕" },
  { slug: "trenerke", label: "Trenerke", icon: "🩳" },
  { slug: "majice", label: "Majice", icon: "👔" },
  { slug: "cizme", label: "Čizme", icon: "👢" },
];

const POPULAR_SEARCHES = [
  { slug: "nike-patike", label: "Nike patike" },
  { slug: "adidas-patike", label: "Adidas patike" },
  { slug: "muski-patike", label: "Muške patike" },
  { slug: "zenski-patike", label: "Ženske patike" },
  { slug: "nike-duksevi", label: "Nike duksevi" },
  { slug: "adidas-jakne", label: "Adidas jakne" },
];

export function PopularCategories() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-16">
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Pronađi po brendu ili kategoriji
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Pregledaj najpopularnije sportske brendove i kategorije sa popustima
          </p>
        </div>

        {/* Featured Brands - Large Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/ponude/${brand.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${brand.color} p-6 md:p-8 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="relative z-10">
                <span className="text-xl md:text-2xl font-bold">{brand.label}</span>
                <span className="block mt-1 text-sm text-white/80 group-hover:text-white transition-colors">
                  Pogledaj ponude →
                </span>
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
            </Link>
          ))}
        </div>

        {/* Other Brands - Smaller Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 mb-10">
          {OTHER_BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/ponude/${brand.slug}`}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-300 hover:bg-red-50 dark:hover:border-red-800 dark:hover:bg-red-900/20 transition-colors"
            >
              {brand.label}
            </Link>
          ))}
        </div>

        {/* Categories - Icon Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/ponude/${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-300 hover:bg-red-50 dark:hover:border-red-800 dark:hover:bg-red-900/20 transition-colors group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
            </Link>
          ))}
        </div>

        {/* Popular Searches - Subtle Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-6 border-t border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-500">Popularno:</span>
          {POPULAR_SEARCHES.map((search) => (
            <Link
              key={search.slug}
              href={`/ponude/${search.slug}`}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {search.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
