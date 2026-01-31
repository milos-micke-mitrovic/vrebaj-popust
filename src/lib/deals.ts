import { prisma } from "./db";
import type { Deal as PrismaDeal } from "@prisma/client";
import { Deal, Store, Gender, Category } from "@/types/deal";
import { mapCategory } from "./category-mapper";
import { extractGenderFromNameUrl } from "./gender-mapper";
import { normalizeBrand } from "./brand-utils";

// Map CategoryPath (e.g., "obuca/patike") to legacy Category type
function mapCategoryPathToCategory(categoryPath: string): Category {
  const path = categoryPath.toLowerCase();

  // Obuca mappings
  if (path.includes("obuca/patike") || path.includes("kopacke")) return "patike";
  if (path.includes("obuca/cipele")) return "cipele";
  if (path.includes("obuca/cizme")) return "cizme";
  if (path.includes("obuca/sandale") || path.includes("obuca/papuce")) return "patike"; // Group with patike for now

  // Odeca mappings
  if (path.includes("odeca/jakne")) return "jakna";
  if (path.includes("odeca/majice") || path.includes("odeca/dres")) return "majica";
  if (path.includes("odeca/duksevi") || path.includes("odeca/dukserice")) return "duks";
  if (path.includes("odeca/trenerke") || path.includes("odeca/pantalone")) return "trenerka";
  if (path.includes("odeca/sorcevi") || path.includes("odeca/bermude")) return "sorc";
  if (path.includes("odeca/helanke")) return "helanke";

  // Oprema mappings
  if (path.includes("oprema/torbe")) return "ranac";

  return "ostalo";
}

// Extract category from product name and URL (fallback if no categories in DB)
function extractCategoryFromName(name: string, url?: string): Category {
  // Extract path only from URL, excluding domain (to avoid matching "sneaker" from "buzzsneakers.rs")
  let urlPath = "";
  if (url) {
    try {
      urlPath = new URL(url).pathname;
    } catch {
      urlPath = url.replace(/https?:\/\/[^/]+/i, "");
    }
  }
  const cat = mapCategory(`${name} ${urlPath}`);
  if (cat) return mapCategoryPathToCategory(cat);
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
  intersport: {
    name: "Intersport",
    logo: "/logos/intersport.jpg",
    url: "https://www.intersport.rs",
  },
  trefsport: {
    name: "Tref Sport",
    logo: "/logos/trefsport.png",
    url: "https://trefsport.com",
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
    gender: (prismaDeal.gender as Gender) || extractGenderFromNameUrl(prismaDeal.name, prismaDeal.url),
    category: getCategory(prismaDeal.categories, prismaDeal.name, prismaDeal.url),
    scrapedAt: prismaDeal.scrapedAt,
    createdAt: prismaDeal.createdAt,
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
