import * as fs from "fs";
import * as path from "path";
import { Deal, ScrapeResult, Store, Gender, Category } from "@/types/deal";

const DATA_DIR = path.join(process.cwd(), "data");

// Extract gender from product name
function extractGender(name: string): Gender {
  const nameLower = name.toLowerCase();

  // Kids patterns
  if (
    nameLower.includes(" kid") ||
    nameLower.includes(" deca") ||
    nameLower.includes(" decij") ||
    nameLower.includes(" bp") ||
    nameLower.includes(" bg") ||
    nameLower.includes(" junior")
  ) {
    return "kids";
  }

  // Women patterns
  if (
    nameLower.includes("za žene") ||
    nameLower.includes("za zene") ||
    nameLower.includes(" w ") ||
    nameLower.endsWith(" w") ||
    nameLower.includes(" wmns") ||
    nameLower.includes(" women")
  ) {
    return "women";
  }

  // Men patterns
  if (
    nameLower.includes("za muškarce") ||
    nameLower.includes("za muskarce") ||
    nameLower.includes(" m ") ||
    nameLower.endsWith(" m") ||
    nameLower.includes(" men")
  ) {
    return "men";
  }

  return "unisex";
}

// Extract category from product name
function extractCategory(name: string): Category {
  const nameLower = name.toLowerCase();

  if (nameLower.includes("patike") || nameLower.includes("sneaker")) return "patike";
  if (nameLower.includes("cipele") || nameLower.includes("shoes")) return "cipele";
  if (nameLower.includes("čizme") || nameLower.includes("cizme") || nameLower.includes("boot")) return "cizme";
  if (nameLower.includes("jakna") || nameLower.includes("jacket")) return "jakna";
  if (nameLower.includes("majica") || nameLower.includes("t-shirt") || nameLower.includes("tee")) return "majica";
  if (nameLower.includes("duks") || nameLower.includes("hoodie") || nameLower.includes("sweat")) return "duks";
  if (nameLower.includes("trenerka") || nameLower.includes("tracksuit")) return "trenerka";
  if (nameLower.includes("šorc") || nameLower.includes("sorc") || nameLower.includes("short")) return "sorc";
  if (nameLower.includes("helanke") || nameLower.includes("legging") || nameLower.includes("tight")) return "helanke";
  if (nameLower.includes("ranac") || nameLower.includes("backpack") || nameLower.includes("torba")) return "ranac";

  return "ostalo";
}

const STORE_FILES: Record<Store, string> = {
  djaksport: "djaksport-deals.json",
  planeta: "planeta-deals.json",
  sportvision: "sportvision-deals.json",
  nsport: "nsport-deals.json",
  buzz: "buzz-deals.json",
  officeshoes: "officeshoes-deals.json",
};

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

export function getAllDeals(): Deal[] {
  const allDeals: Deal[] = [];
  const seenUrls = new Set<string>();

  for (const [store, filename] of Object.entries(STORE_FILES)) {
    const filePath = path.join(DATA_DIR, filename);
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(
          fs.readFileSync(filePath, "utf-8")
        ) as ScrapeResult;
        // Enrich deals with gender and category, filter duplicates by URL
        for (const deal of data.deals) {
          if (seenUrls.has(deal.url)) continue;
          seenUrls.add(deal.url);

          const enrichedDeal: Deal = {
            ...deal,
            gender: extractGender(deal.name),
            category: extractCategory(deal.name),
          };
          allDeals.push(enrichedDeal);
        }
      }
    } catch {
      console.error(`Error loading ${store} deals`);
    }
  }

  // Sort by discount (highest first)
  return allDeals.sort((a, b) => b.discountPercent - a.discountPercent);
}

export function getDealById(id: string): Deal | null {
  const allDeals = getAllDeals();
  return allDeals.find((deal) => deal.id === id) || null;
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
  return ["men", "women", "kids", "unisex"];
}

export function getUniqueCategories(): Category[] {
  const allDeals = getAllDeals();
  const categories = new Set<Category>();
  allDeals.forEach((deal) => categories.add(deal.category));
  return Array.from(categories);
}

export function getPriceRange(): { min: number; max: number } {
  const allDeals = getAllDeals();
  const prices = allDeals.map((d) => d.salePrice);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function getRelatedDeals(deal: Deal, limit: number = 8): Deal[] {
  const allDeals = getAllDeals();
  const related: Deal[] = [];
  const seen = new Set<string>([deal.id]);

  // Priority 1: Same brand and category
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.brand && d.brand === deal.brand && d.category === deal.category) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 2: Same category and gender
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.category === deal.category && d.gender === deal.gender) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 3: Same category
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.category === deal.category) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 4: Same brand
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.brand && d.brand === deal.brand) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  // Priority 5: Same store
  for (const d of allDeals) {
    if (seen.has(d.id)) continue;
    if (d.store === deal.store) {
      related.push(d);
      seen.add(d.id);
      if (related.length >= limit) return related;
    }
  }

  return related;
}
