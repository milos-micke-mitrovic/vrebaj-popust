import { Category, Gender, Store } from "@/types/deal";

// Known stores (URL slug → internal Store value)
const STORE_SLUGS: Record<string, Store> = {
  djaksport: "djaksport",
  planeta: "planeta",
  sportvision: "sportvision",
  nsport: "nsport",
  buzz: "buzz",
  officeshoes: "officeshoes",
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

// Known multi-word brands (URL slug → brand name for API)
// These must be matched FIRST before splitting by dash
const MULTI_WORD_BRANDS: Record<string, string> = {
  "new-balance": "NEW BALANCE",
  "under-armour": "UNDER ARMOUR",
  "the-north-face": "THE NORTH FACE",
  "tommy-hilfiger": "TOMMY HILFIGER",
  "calvin-klein": "CALVIN KLEIN",
  "office-shoes": "OFFICE SHOES",
  "planeta-sport": "PLANETA SPORT",
  "sport-vision": "SPORT VISION",
  "n-sport": "N SPORT",
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
  ranac: "rančevi",
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

  // Step 1: Extract known multi-word brands first
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

  return `${brandText} ${categoryText}${genderText}${storeText} sa popustima preko 50%. Pronađi najbolje ponude na sportsku opremu u Srbiji.`;
}

/**
 * Generate keywords from parsed filter
 */
export function generateKeywords(parsed: ParsedFilter): string[] {
  const keywords: string[] = [];

  if (parsed.brand) {
    keywords.push(`${parsed.brand.toLowerCase()} popust`);
    keywords.push(`${parsed.brand.toLowerCase()} akcija`);
    keywords.push(`${parsed.brand.toLowerCase()} srbija`);
  }

  if (parsed.category) {
    const cat = CATEGORY_DISPLAY[parsed.category];
    keywords.push(`${cat} popust`);
    keywords.push(`${cat} akcija`);
    keywords.push(`${cat} sniženje`);
  }

  if (parsed.gender) {
    const g = parsed.gender === "muski" ? "muški" : parsed.gender === "zenski" ? "ženski" : "dečiji";
    keywords.push(`${g} sportska oprema`);
  }

  if (parsed.brand && parsed.category) {
    keywords.push(`${parsed.brand.toLowerCase()} ${CATEGORY_DISPLAY[parsed.category]} popust`);
  }

  return keywords;
}

// Export constants for use elsewhere
export { GENDER_SLUGS, CATEGORY_SLUGS, GENDER_DISPLAY, CATEGORY_DISPLAY, STORE_SLUGS, STORE_DISPLAY };
