import Link from "next/link";
import Image from "next/image";

const FEATURED_BRANDS = [
  { slug: "nike", label: "Nike", logo: "/logos/nike.svg", color: "from-gray-900 to-gray-700" },
  { slug: "adidas", label: "Adidas", logo: "/logos/adidas.svg", color: "from-blue-900 to-blue-700" },
  { slug: "puma", label: "Puma", logo: "/logos/puma.svg", color: "from-red-900 to-red-700" },
  { slug: "new-balance", label: "New Balance", logo: "/logos/new-balance.svg", color: "from-gray-800 to-gray-600" },
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
  { slug: "patike", label: "Patike", image: "/images/categories/sneakers.png" },
  { slug: "jakne", label: "Jakne", image: "/images/categories/jacket.png" },
  { slug: "duksevi", label: "Duksevi", image: "/images/categories/hoodie.png" },
  { slug: "trenerke", label: "Trenerke", image: "/images/categories/tracksuit.png" },
  { slug: "majice", label: "Majice", image: "/images/categories/tshirt.png" },
  { slug: "cizme", label: "Čizme", image: "/images/categories/boots.png" },
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

        {/* Featured Brands - Large Cards with Logos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/ponude/${brand.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${brand.color} p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
            >
              {/* Logo */}
              <div className="flex items-center justify-center h-16 md:h-20 mb-4">
                <Image
                  src={brand.logo}
                  alt={brand.label}
                  width={140}
                  height={70}
                  className="object-contain w-[100px] md:w-[120px] h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              {/* CTA */}
              <div className="text-center">
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                  Pogledaj ponude →
                </span>
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
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

        {/* Categories - Image Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/ponude/${cat.slug}`}
              className="group relative overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm md:text-base font-semibold text-white drop-shadow-lg">{cat.label}</span>
              </div>
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
