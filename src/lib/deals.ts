import { prisma } from "./db";
import type { Deal as PrismaDeal } from "@prisma/client";
import { Deal, Store, Gender, Category } from "@/types/deal";

// Normalize Serbian characters to ASCII equivalents
function normalizeSerbianChars(text: string): string {
  return text
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/đ/g, "dj");
}

// Extract gender from product name and URL (fallback if not in DB)
function extractGender(name: string, url?: string): Gender {
  const text = normalizeSerbianChars(`${name} ${url || ""}`);

  // Kids patterns - check first as it's most specific
  if (
    text.includes("decij") ||
    text.includes("decak") ||    // dečak, dečake (boys) - normalized
    text.includes("decac") ||    // dečaci (boys) - normalized
    text.includes("devojc") ||   // devojčica (girls) - normalized
    text.includes("devoj") ||    // devojke, devojka (girls)
    text.includes("deca") ||     // deca (children) - also catches "dečak" after normalization
    text.includes("/deca/") ||
    text.includes("-deca-") ||
    text.includes(" kid") ||
    text.includes(" kids") ||
    text.includes("-kid-") ||
    text.includes(" bp") ||      // Boys preschool
    text.includes(" bg") ||      // Boys grade school
    text.includes(" ps") ||      // Preschool
    text.includes(" gs") ||      // Grade school
    text.includes(" td") ||      // Toddler
    text.includes(" junior") ||
    text.includes(" jr") ||
    text.includes("-jr-") ||
    text.includes(" youth") ||
    text.includes("/decije-") ||
    text.includes("/decija-") ||
    text.includes("beba") ||     // beba (baby)
    text.includes("bebe") ||     // bebe (babies)
    text.includes("infant") ||
    text.includes("toddler") ||
    text.includes("child") ||
    text.includes("children")
  ) {
    return "deciji";
  }

  // Women patterns
  if (
    text.includes("zenski") ||
    text.includes("zensk") ||
    text.includes("za zene") ||
    text.includes(" zene") ||
    text.includes(" zena") ||
    text.includes("/zene/") ||
    text.includes("/zena/") ||
    text.includes("/zenske-") ||
    text.includes("/zenska-") ||
    text.includes("-zenske-") ||
    text.includes(" w ") ||
    text.endsWith(" w") ||
    text.includes("-w-") ||
    text.includes(" wmns") ||
    text.includes(" women") ||
    text.includes("woman") ||
    text.includes("/women/") ||
    text.includes("-women-") ||
    text.includes(" lady") ||
    text.includes(" ladies") ||
    text.includes("female") ||
    text.includes(" girl") ||
    text.includes("/girl/")
  ) {
    return "zenski";
  }

  // Men patterns
  if (
    text.includes("muski") ||
    text.includes("musk") ||
    text.includes("muskarc") ||
    text.includes("za muskarce") ||
    text.includes("/muskarci/") ||
    text.includes("/muskarac/") ||
    text.includes("/muske-") ||
    text.includes("/muska-") ||
    text.includes("-muske-") ||
    text.includes(" m ") ||
    text.endsWith(" m") ||
    text.includes("-m-") ||
    text.includes(" men ") ||
    text.includes(" men's") ||
    text.includes("/men/") ||
    text.includes("-men-") ||
    text.includes("male") ||
    text.includes(" guy")
  ) {
    return "muski";
  }

  return "unisex";
}

// Map CategoryPath (e.g., "obuca/patike") to legacy Category type
function mapCategoryPathToCategory(categoryPath: string): Category {
  const path = categoryPath.toLowerCase();

  // Obuca mappings
  if (path.includes("obuca/patike") || path.includes("kopacke")) return "patike";
  if (path.includes("obuca/cipele")) return "cipele";
  if (path.includes("obuca/cizme")) return "cizme";
  if (path.includes("obuca/sandale") || path.includes("obuca/japanke") || path.includes("obuca/papuce")) return "patike"; // Group with patike for now

  // Odeca mappings
  if (path.includes("odeca/jakne") || path.includes("odeca/prsluci")) return "jakna";
  if (path.includes("odeca/majice") || path.includes("odeca/dres")) return "majica";
  if (path.includes("odeca/duksevi") || path.includes("odeca/dukserice")) return "duks";
  if (path.includes("odeca/trenerke") || path.includes("odeca/pantalone")) return "trenerka";
  if (path.includes("odeca/sorcevi") || path.includes("odeca/bermude")) return "sorc";
  if (path.includes("odeca/helanke")) return "helanke";

  // Oprema mappings
  if (path.includes("oprema/torbe") || path.includes("oprema/rancevi")) return "ranac";

  return "ostalo";
}

// Extract category from product name and URL (fallback if no categories in DB)
function extractCategoryFromName(name: string, url?: string): Category {
  const text = normalizeSerbianChars(`${name} ${url || ""}`);

  // Cizme - boots (check before cipele since "boot" shouldn't match cipele)
  if (
    text.includes("cizm") ||
    text.includes("boot") ||
    text.includes("gumenjak")
  ) return "cizme";

  // Patike - sneakers, trainers
  if (
    text.includes("patik") ||
    text.includes("sneaker") ||
    text.includes("kopack") ||
    text.includes("tenisic") ||
    text.includes("trainer") ||
    text.includes("running") ||
    text.includes("lifestyle-patike") ||
    text.includes("patike-za-") ||
    text.includes("/patike/")
  ) return "patike";

  // Cipele - shoes (but not boots or sneakers)
  if (
    text.includes("cipel") ||
    text.includes("/cipele/") ||
    (text.includes("shoe") && !text.includes("sneaker"))
  ) return "cipele";

  // Jakne - jackets, vests
  if (
    text.includes("jakn") ||
    text.includes("jacket") ||
    text.includes("prslu") ||
    text.includes("vest") ||
    text.includes("vetrovk") ||
    text.includes("windbreak") ||
    text.includes("zimsk") ||
    text.includes("puffer") ||
    text.includes("/jakne/")
  ) return "jakna";

  // Majice - t-shirts, jerseys
  if (
    text.includes("majic") ||
    text.includes("t-shirt") ||
    text.includes("tshirt") ||
    text.includes(" tee ") ||
    text.includes("dres") ||
    text.includes("jersey") ||
    text.includes("polo") ||
    text.includes("tank top") ||
    text.includes("/majice/")
  ) return "majica";

  // Duksevi - hoodies, sweatshirts
  if (
    text.includes("duks") ||
    text.includes("hoodie") ||
    text.includes("sweat") ||
    text.includes("hudica") ||
    text.includes("pulover") ||
    text.includes("/duksevi/")
  ) return "duks";

  // Trenerke - tracksuits, pants
  if (
    text.includes("trenerk") ||
    text.includes("tracksuit") ||
    text.includes("donji deo") ||
    text.includes("pantalon") ||
    text.includes("jogger") ||
    text.includes("sweatpant") ||
    text.includes("/trenerka/") ||
    text.includes("/trenerke/")
  ) return "trenerka";

  // Sorcevi - shorts
  if (
    text.includes("sorc") ||
    text.includes("short") ||
    text.includes("bermud") ||
    text.includes("/sorcevi/")
  ) return "sorc";

  // Helanke - leggings
  if (
    text.includes("helank") ||
    text.includes("legging") ||
    text.includes("tight") ||
    text.includes("tajic") ||
    text.includes("/helanke/")
  ) return "helanke";

  // Ranci i torbe - backpacks, bags
  if (
    text.includes("ranac") ||
    text.includes("backpack") ||
    text.includes("torb") ||
    text.includes("ruksak") ||
    text.includes("duffel") ||
    text.includes("gym bag") ||
    text.includes("/torbe/") ||
    text.includes("/rancevi/")
  ) return "ranac";

  return "ostalo";
}

// Get category - prefer DB categories, fallback to name/URL extraction
function getCategory(categories: string[], name: string, url?: string): Category {
  // If we have categories from DB, use the first one
  if (categories && categories.length > 0) {
    return mapCategoryPathToCategory(categories[0]);
  }
  // Fallback to extracting from name and URL
  return extractCategoryFromName(name, url);
}

// Normalize brand name to consistent format (uppercase)
function normalizeBrand(brand: string): string {
  return brand.toUpperCase().trim();
}

export const STORE_INFO: Record<
  Store,
  { name: string; logo: string; url: string }
> = {
  djaksport: {
    name: "Djak Sport",
    logo: "/logos/djaksport.png",
    url: "https://www.djaksport.com",
  },
  planeta: {
    name: "Planeta Sport",
    logo: "/logos/planeta.png",
    url: "https://www.planetasport.rs",
  },
  sportvision: {
    name: "Sport Vision",
    logo: "/logos/sportvision.png",
    url: "https://www.sportvision.rs",
  },
  nsport: {
    name: "N Sport",
    logo: "/logos/nsport.jpg",
    url: "https://www.n-sport.net",
  },
  buzz: {
    name: "Buzz Sneakers",
    logo: "/logos/buzz.png",
    url: "https://www.buzzsneakers.rs",
  },
  officeshoes: {
    name: "Office Shoes",
    logo: "/logos/officeshoes.png",
    url: "https://www.officeshoes.rs",
  },
};

// Convert Prisma deal to app Deal type
function convertDeal(prismaDeal: PrismaDeal): Deal {
  return {
    id: prismaDeal.id,
    store: prismaDeal.store as Store,
    name: prismaDeal.name,
    brand: prismaDeal.brand ? normalizeBrand(prismaDeal.brand) : null,
    originalPrice: prismaDeal.originalPrice,
    salePrice: prismaDeal.salePrice,
    discountPercent: prismaDeal.discountPercent,
    url: prismaDeal.url,
    imageUrl: prismaDeal.imageUrl,
    gender: (prismaDeal.gender as Gender) || extractGender(prismaDeal.name, prismaDeal.url),
    category: getCategory(prismaDeal.categories, prismaDeal.name, prismaDeal.url),
    scrapedAt: prismaDeal.scrapedAt,
    sizes: prismaDeal.sizes,
    description: prismaDeal.description,
    detailImageUrl: prismaDeal.detailImageUrl,
    detailsScrapedAt: prismaDeal.detailsScrapedAt || undefined,
    categories: prismaDeal.categories as import("@/types/deal").CategoryPath[],
  };
}

// In-memory cache for deals (refreshed every request in dev, cached in prod)
let dealsCache: Deal[] | null = null;
let lastFetch = 0;
const CACHE_TTL = process.env.NODE_ENV === "production" ? 60000 : 0; // 1 min in prod, no cache in dev

async function fetchDeals(): Promise<Deal[]> {
  const now = Date.now();
  if (dealsCache && now - lastFetch < CACHE_TTL) {
    return dealsCache;
  }

  const prismaDeals = await prisma.deal.findMany({
    orderBy: { discountPercent: "desc" },
  });

  dealsCache = prismaDeals.map(convertDeal);
  lastFetch = now;
  return dealsCache;
}

export function getAllDeals(): Deal[] {
  // For SSR/SSG, we use a synchronous approach with cache
  // This is safe because Next.js will call this during build/request time
  if (dealsCache) {
    return dealsCache;
  }

  // Fallback: return empty array if cache not populated
  // In production, this should be populated by getStaticProps or similar
  console.warn("Deals cache not populated, returning empty array");
  return [];
}

// Async version for use in API routes or server actions
export async function getAllDealsAsync(): Promise<Deal[]> {
  return fetchDeals();
}

// Initialize cache (call this in layout or page)
export async function initDealsCache(): Promise<void> {
  await fetchDeals();
}

export function getDealById(id: string): Deal | null {
  const allDeals = getAllDeals();
  return allDeals.find((deal) => deal.id === id) || null;
}

export async function getDealByIdAsync(id: string): Promise<Deal | null> {
  const prismaDeal = await prisma.deal.findUnique({
    where: { id },
  });
  return prismaDeal ? convertDeal(prismaDeal) : null;
}

export function getDealsByStore(store: Store): Deal[] {
  const allDeals = getAllDeals();
  return allDeals.filter((deal) => deal.store === store);
}

export function getUniqueBrands(): string[] {
  const allDeals = getAllDeals();
  const brands = new Set<string>();
  allDeals.forEach((deal) => {
    if (deal.brand) brands.add(deal.brand);
  });
  return Array.from(brands).sort();
}

export function getUniqueStores(): Store[] {
  const allDeals = getAllDeals();
  const stores = new Set<Store>();
  allDeals.forEach((deal) => stores.add(deal.store));
  return Array.from(stores);
}

export function getAllDealIds(): string[] {
  return getAllDeals().map((deal) => deal.id);
}

export function getUniqueGenders(): Gender[] {
  return ["muski", "zenski", "deciji", "unisex"];
}

export function getUniqueCategories(): Category[] {
  const allDeals = getAllDeals();
  const categories = new Set<Category>();
  allDeals.forEach((deal) => categories.add(deal.category));
  return Array.from(categories);
}

export function getPriceRange(): { min: number; max: number } {
  const allDeals = getAllDeals();
  if (allDeals.length === 0) {
    return { min: 0, max: 100000 };
  }
  const prices = allDeals.map((d) => d.salePrice);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function getTopDeals(limit: number = 8): Deal[] {
  const allDeals = getAllDeals();
  // Already sorted by discount (highest first)
  return allDeals.slice(0, limit);
}

export function getDealsByCategory(category: Category, limit: number = 8): Deal[] {
  const allDeals = getAllDeals();
  return allDeals.filter((d) => d.category === category).slice(0, limit);
}

export function getRelatedDeals(deal: Deal, limit: number = 8): Deal[] {
  const allDeals = getAllDeals();
  const related: Deal[] = [];
  const seen = new Set<string>([deal.id]);

  // Helper: check if genders are compatible (same gender or unisex)
  const genderMatch = (d: Deal) =>
    d.gender === deal.gender || d.gender === "unisex" || deal.gender === "unisex";

  // Priority 1: Same brand, category, and gender
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.brand && d.brand === deal.brand && d.category === deal.category && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 2: Same category and gender
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.category === deal.category && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 3: Same brand and gender
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.brand && d.brand === deal.brand && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 4: Same gender and store
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.store === deal.store && genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 5: Same gender only (fallback)
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (genderMatch(d)) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  return related;
}
