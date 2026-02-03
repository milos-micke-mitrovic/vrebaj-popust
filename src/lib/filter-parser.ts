import { Category, Gender, Store } from "@/types/deal";

// Known stores (URL slug → internal Store value)
// Must match sitemap.ts exactly
const STORE_SLUGS: Record<string, Store> = {
  buzz: "buzz",
  intersport: "intersport",
};

// Known genders (URL slug → internal value)
const GENDER_SLUGS: Record<string, Gender> = {
  muski: "muski",
  zenski: "zenski",
  deciji: "deciji",
};

// Known categories (URL slug → internal Category value)
const CATEGORY_SLUGS: Record<string, Category> = {
  patike: "patike",
  cipele: "cipele",
  cizme: "cizme",
  jakne: "jakna",
  majice: "majica",
  duksevi: "duks",
  trenerke: "trenerka",
  sorcevi: "sorc",
  helanke: "helanke",
  ranac: "ranac",
};

// Known multi-word stores (URL slug → Store value)
// Must match sitemap.ts exactly
const MULTI_WORD_STORES: Record<string, Store> = {
  "djak-sport": "djaksport",
  "planeta-sport": "planeta",
  "sport-vision": "sportvision",
  "office-shoes": "officeshoes",
  "n-sport": "nsport",
  "tref-sport": "trefsport",
};

// Known multi-word brands (URL slug → brand name for API)
// These must be matched FIRST before splitting by dash
const MULTI_WORD_BRANDS: Record<string, string> = {
  "new-balance": "NEW BALANCE",
  "under-armour": "UNDER ARMOUR",
  "the-north-face": "THE NORTH FACE",
  "tommy-hilfiger": "TOMMY HILFIGER",
  "calvin-klein": "CALVIN KLEIN",
};

// Display names for genders
const GENDER_DISPLAY: Record<Gender, string> = {
  muski: "muškarce",
  zenski: "žene",
  deciji: "decu",
  unisex: "sve",
};

// Display names for categories (plural for titles)
const CATEGORY_DISPLAY: Record<Category, string> = {
  patike: "patike",
  cipele: "cipele",
  cizme: "čizme",
  jakna: "jakne",
  majica: "majice",
  duks: "duksevi",
  trenerka: "trenerke",
  sorc: "šorcevi",
  helanke: "helanke",
  ranac: "torbe",
  ostalo: "ostalo",
};

// Display names for stores
const STORE_DISPLAY: Record<Store, string> = {
  djaksport: "Djak Sport",
  planeta: "Planeta Sport",
  sportvision: "Sport Vision",
  nsport: "N Sport",
  buzz: "Buzz",
  officeshoes: "Office Shoes",
  intersport: "Intersport",
  trefsport: "Tref Sport",
};

export interface ParsedFilter {
  gender: Gender | null;
  brand: string | null;      // Uppercase for API
  brandSlug: string | null;  // Original slug
  category: Category | null;
  categorySlug: string | null;
  store: Store | null;
  isValid: boolean;
}

/**
 * Smart parser for filter slugs like:
 * - "nike" → brand only
 * - "patike" → category only
 * - "muski" → gender only
 * - "nike-patike" → brand + category
 * - "muski-nike" → gender + brand
 * - "muski-nike-patike" → all three
 * - "the-north-face-jakne" → multi-word brand + category
 */
export function parseFilterSlug(slug: string): ParsedFilter {
  const result: ParsedFilter = {
    gender: null,
    brand: null,
    brandSlug: null,
    category: null,
    categorySlug: null,
    store: null,
    isValid: false,
  };

  if (!slug) return result;

  let remaining = slug.toLowerCase();
  const parts: string[] = [];

  // Step 1: Extract known multi-word stores first
  for (const [storeSlug, storeValue] of Object.entries(MULTI_WORD_STORES)) {
    if (remaining.includes(storeSlug)) {
      result.store = storeValue;
      // Remove the store from remaining string
      remaining = remaining.replace(storeSlug, "").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
      break;
    }
  }

  // Step 2: Extract known multi-word brands
  for (const [brandSlug, brandName] of Object.entries(MULTI_WORD_BRANDS)) {
    if (remaining.includes(brandSlug)) {
      result.brand = brandName;
      result.brandSlug = brandSlug;
      // Remove the brand from remaining string
      remaining = remaining.replace(brandSlug, "").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
      break;
    }
  }

  // Step 2: Split remaining by dash and identify each part
  if (remaining) {
    parts.push(...remaining.split("-").filter(Boolean));
  }

  for (const part of parts) {
    // Check if it's a store FIRST (before treating as brand)
    if (STORE_SLUGS[part] && !result.store) {
      result.store = STORE_SLUGS[part];
    }
    // Check if it's a gender
    else if (GENDER_SLUGS[part] && !result.gender) {
      result.gender = GENDER_SLUGS[part];
    }
    // Check if it's a category
    else if (CATEGORY_SLUGS[part] && !result.category) {
      result.category = CATEGORY_SLUGS[part];
      result.categorySlug = part;
    }
    // Otherwise it's a brand (if we don't have one yet)
    else if (!result.brand && part.length > 1) {
      result.brand = part.toUpperCase();
      result.brandSlug = part;
    }
  }

  // Valid if we found at least one filter
  result.isValid = !!(result.gender || result.brand || result.category || result.store);

  return result;
}

/**
 * Generate SEO title from parsed filter
 */
export function generateSeoTitle(parsed: ParsedFilter): string {
  const parts: string[] = [];

  if (parsed.brand) {
    parts.push(parsed.brand);
  }

  if (parsed.category) {
    parts.push(CATEGORY_DISPLAY[parsed.category]);
  }

  if (parsed.gender) {
    parts.push(`za ${GENDER_DISPLAY[parsed.gender]}`);
  }

  if (parsed.store) {
    parts.push(`u ${STORE_DISPLAY[parsed.store]}`);
  }

  if (parts.length === 0) {
    return "Proizvodi na popustu";
  }

  // Capitalize first letter
  const title = parts.join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1) + " na popustu";
}

/**
 * Generate SEO description from parsed filter
 */
export function generateSeoDescription(parsed: ParsedFilter): string {
  const brandText = parsed.brand || "Sportski proizvodi";
  const categoryText = parsed.category ? CATEGORY_DISPLAY[parsed.category] : "oprema";
  const genderText = parsed.gender ? ` za ${GENDER_DISPLAY[parsed.gender]}` : "";
  const storeText = parsed.store ? ` u prodavnici ${STORE_DISPLAY[parsed.store]}` : "";

  return `${brandText} ${categoryText}${genderText}${storeText} sa popustima i akcijama preko 50%. Pronađi najbolje ponude na sportsku opremu u Srbiji.`;
}

/**
 * Generate keywords from parsed filter
 */
export function generateKeywords(parsed: ParsedFilter): string[] {
  const keywords: string[] = [];

  if (parsed.brand) {
    const b = parsed.brand.toLowerCase();
    keywords.push(`${b} popust`);
    keywords.push(`${b} akcija`);
    keywords.push(`${b} srbija`);
    keywords.push(`${b} online kupovina`);
    keywords.push(`${b} sniženje`);
  }

  if (parsed.category) {
    const cat = CATEGORY_DISPLAY[parsed.category];
    keywords.push(`${cat} popust`);
    keywords.push(`${cat} akcija`);
    keywords.push(`${cat} sniženje`);
    keywords.push(`${cat} rasprodaja`);
    keywords.push(`jeftino ${cat}`);
  }

  if (parsed.gender) {
    const g = parsed.gender === "muski" ? "muški" : parsed.gender === "zenski" ? "ženski" : "dečiji";
    keywords.push(`${g} sportska oprema`);
    keywords.push(`${g} sportska odeća`);
  }

  if (parsed.store) {
    const s = STORE_DISPLAY[parsed.store];
    keywords.push(`${s} popust`);
    keywords.push(`${s} akcija`);
  }

  if (parsed.brand && parsed.category) {
    keywords.push(`${parsed.brand.toLowerCase()} ${CATEGORY_DISPLAY[parsed.category]} popust`);
    keywords.push(`${parsed.brand.toLowerCase()} ${CATEGORY_DISPLAY[parsed.category]} akcija`);
  }

  if (parsed.store && parsed.brand) {
    keywords.push(`${parsed.brand.toLowerCase()} ${STORE_DISPLAY[parsed.store]} popust`);
  }

  keywords.push("online kupovina", "srbija", "beograd", "novi sad");

  return keywords;
}

/**
 * Generate intro text for filter pages (visible SEO content)
 */
export function generateIntroText(parsed: ParsedFilter): string {
  const parts: string[] = [];

  if (parsed.brand && parsed.category) {
    const cat = CATEGORY_DISPLAY[parsed.category];
    parts.push(`Pogledajte ${parsed.brand} ${cat} sa popustom preko 50%.`);
    parts.push(`Pronađite ${cat} od brenda ${parsed.brand} po sniženim cenama u sportskim prodavnicama u Srbiji.`);
  } else if (parsed.brand) {
    parts.push(`Pogledajte ${parsed.brand} proizvode sa popustom preko 50%.`);
    parts.push(`Pronađite sportsku opremu, obuću i odeću od brenda ${parsed.brand} po sniženim cenama u Srbiji.`);
  } else if (parsed.category) {
    const cat = CATEGORY_DISPLAY[parsed.category];
    parts.push(`Pronađite ${cat} na popustu preko 50%.`);
    parts.push(`Pregledajte ${cat} iz najvećih sportskih prodavnica u Srbiji po sniženim cenama.`);
  } else if (parsed.store) {
    const store = STORE_DISPLAY[parsed.store];
    parts.push(`Pogledajte sve ponude iz prodavnice ${store} sa popustom preko 50%.`);
    parts.push(`Pronađite sportsku opremu, obuću i odeću iz ${store} po sniženim cenama.`);
  } else if (parsed.gender) {
    const g = GENDER_DISPLAY[parsed.gender];
    parts.push(`Pronađite sportsku opremu za ${g} sa popustom preko 50%.`);
    parts.push(`Pregledajte ponude iz najvećih sportskih prodavnica u Srbiji.`);
  }

  if (parsed.gender && (parsed.brand || parsed.category)) {
    const g = GENDER_DISPLAY[parsed.gender];
    parts.push(`Filtrirana ponuda za ${g}.`);
  }

  if (parsed.store && (parsed.brand || parsed.category)) {
    const store = STORE_DISPLAY[parsed.store];
    parts.push(`Dostupno u prodavnici ${store}.`);
  }

  return parts.join(" ");
}

// Export constants for use elsewhere
export { GENDER_SLUGS, CATEGORY_SLUGS, GENDER_DISPLAY, CATEGORY_DISPLAY, STORE_SLUGS, STORE_DISPLAY };
