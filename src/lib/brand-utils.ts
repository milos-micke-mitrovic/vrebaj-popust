// Brand normalization utilities
// Used by both scrapers and API to ensure consistent brand names

// Known multi-word brands (must match these before falling back to first word)
export const KNOWN_BRANDS: string[] = [
  "THE NORTH FACE",
  "CALVIN KLEIN",
  "KARL LAGERFELD",
  "TOMMY HILFIGER",
  "TOMMY JEANS",
  "NEW BALANCE",
  "UNDER ARMOUR",
  "ICE PEAK",
  "SERGIO TACCHINI",
  "HUGO BOSS",
  "PEPE JEANS",
  "POLO RALPH LAUREN",
  "RALPH LAUREN",
  "FRED PERRY",
  "JACK JONES",
  "JACK WOLFSKIN",
  "NORTH SAILS",
  "LE COQ SPORTIF",
  "U.S. POLO",
  "US POLO",
  "EA7",
  "EMPORIO ARMANI",
  "ARMANI EXCHANGE",
  "MARC OPOLO",
  "MARC O'POLO",
  "G STAR",
  "G-STAR",
  "ALPHA INDUSTRIES",
  "MOON BOOT",
  "DR MARTENS",
  "DR. MARTENS",
  "RIDER",
  "IPANEMA",
  "HAVAIANAS",
  "CROCS",
];

// Brand aliases - map variants to canonical name
// Key = canonical name (uppercase, spaces), Value = variants to merge
export const BRAND_ALIASES: Record<string, string[]> = {
  "NIKE": [
    "AIR",  // Air Max, Air Force, Air Jordan - all Nike
  ],
  "CALVIN KLEIN": [
    "CALVIN",
    "CK",
    "CALVIN_KLEIN",
    "CALVIN_KLEIN_BLACK_LABEL",
    "CALVIN_KLEIN_JEANS",
    "CALVIN KLEIN BLACK LABEL",
    "CALVIN KLEIN JEANS",
  ],
  "ICE PEAK": [
    "ICE",
    "ICEPEAK",
    "ICE_PEAK",
  ],
  "KARL LAGERFELD": [
    "KARL",
    "KARL_LAGERFELD",
  ],
  "NEW BALANCE": [
    "NEW_BALANCE",
    "NB",
  ],
  "TOMMY HILFIGER": [
    "TOMMY",
    "TOMMY_HILFIGER",
    "TOMMY_JEANS",
    "TOMMY JEANS",
  ],
  "UNDER ARMOUR": [
    "UNDER_ARMOUR",
    "UA",
  ],
  "SERGIO TACCHINI": [
    "SERGIO",
    "SERGIO_TACCHINI",
  ],
  "SKECHERS": [
    "SKECHERS_BLUE",
  ],
  "THE NORTH FACE": [
    "THE",
    "THE_NORTH_FACE",
    "NORTH_FACE",
    "NORTH FACE",
    "TNF",
  ],
  "HUGO BOSS": [
    "HUGO",
    "BOSS",
    "HUGO_BOSS",
  ],
  "HUMMEL": [
    "HML",
  ],
  "PEPE JEANS": [
    "PEPE",
    "PEPE_JEANS",
  ],
  "MOON BOOT": [
    "MOON_BOOT",
  ],
  "DR MARTENS": [
    "DR_MARTENS",
    "DR. MARTENS",
    "DR.",
  ],
  "ALPHA INDUSTRIES": [
    "ALPHA_INDUSTRIES",
    "ALPHA",
  ],
  "JACK WOLFSKIN": [
    "JACK_WOLFSKIN",
  ],
  "G-STAR": [
    "G_STAR",
    "G STAR",
    "GSTAR",
  ],
};

// Words that are genders, not brands (Serbian)
export const GENDER_WORDS: Set<string> = new Set([
  "MUSKA",
  "MUŠKA",
  "MUSKE",
  "MUŠKI",
  "MUSKI",
  "ZENSKA",
  "ŽENSKA",
  "ZENSKE",
  "ŽENSKI",
  "ZENSKI",
  "DECIJA",
  "DEČIJA",
  "DECIJE",
  "DEČIJE",
  "DECIJI",
  "DEČIJI",
  "UNISEX",
]);

// Words that are categories, not brands (Serbian)
export const CATEGORY_WORDS: Set<string> = new Set([
  "RANAC",
  "RUKSAK",
  "TORBA",
  "SANDALE",
  "PAPUCE",
  "PAPUČE",
  "JAPANKE",
  "PATIKE",
  "CIPELE",
  "CIZME",
  "ČIZME",
  "MAJICA",
  "MAJICE",
  "JAKNA",
  "JAKNE",
  "DUKS",
  "DUKSEVI",
  "TRENERKA",
  "TRENERKE",
  "SORC",
  "ŠORC",
  "SORCEVI",
  "ŠORCEVI",
  "HELANKE",
  "BERMUDE",
  "KAPA",
  "KAPE",
  "SAL",
  "ŠAL",
  "RUKAVICE",
  "LOPTA",
  "LOPTE",
  "CARAPE",
  "ČARAPE",
  "DRES",
  "DRESOVI",
]);

// Build reverse lookup: variant -> canonical
const ALIAS_TO_CANONICAL: Map<string, string> = new Map();
for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toUpperCase(), canonical);
  }
  // Also map canonical to itself
  ALIAS_TO_CANONICAL.set(canonical, canonical);
}

/**
 * Normalize a brand name to its canonical form
 * - Converts underscores to spaces
 * - Converts to uppercase
 * - Merges aliases to canonical names
 * - Returns null if the brand is actually a gender or category word
 */
export function normalizeBrand(brand: string | null | undefined): string | null {
  if (!brand) return null;

  // Clean up: trim, uppercase, replace underscores with spaces
  const normalized = brand.trim().toUpperCase().replace(/_/g, " ");

  // Check if this is a gender word (not a brand)
  if (GENDER_WORDS.has(normalized)) {
    return null;
  }

  // Check if this is a category word (not a brand)
  if (CATEGORY_WORDS.has(normalized)) {
    return null;
  }

  // Check if this maps to a canonical brand
  const canonical = ALIAS_TO_CANONICAL.get(normalized);
  if (canonical) {
    return canonical;
  }

  // Return normalized brand (uppercase, spaces instead of underscores)
  return normalized;
}

/**
 * Extract brand from product name
 * Tries to match known multi-word brands first, then falls back to first uppercase word
 */
export function extractBrandFromName(name: string): string | null {
  if (!name) return null;

  const nameTrimmed = name.trim();
  const nameUpper = nameTrimmed.toUpperCase();

  // First try to match known multi-word brands at the start
  for (const brand of KNOWN_BRANDS) {
    if (nameUpper.startsWith(brand + " ") || nameUpper === brand) {
      return brand;
    }
    // Also try with underscores
    const brandUnderscore = brand.replace(/ /g, "_");
    if (nameUpper.startsWith(brandUnderscore + " ") || nameUpper === brandUnderscore) {
      return brand;
    }
  }

  // Try to match aliases at the start (e.g., "HML" for Hummel)
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      const aliasUpper = alias.toUpperCase();
      if (nameUpper.startsWith(aliasUpper + " ") || nameUpper === aliasUpper) {
        return canonical;
      }
    }
  }

  // Fall back to first/second word if it's uppercase and long enough
  const parts = nameTrimmed.split(/\s+/);

  // Check first two words - brand might be second if first is category (e.g., "SANDALE RIDER...")
  for (let i = 0; i < Math.min(2, parts.length); i++) {
    const word = parts[i];
    // Check if word is all uppercase (brand-like) and at least 2 chars
    if (word === word.toUpperCase() && word.length >= 2) {
      // But filter out gender/category words
      const normalized = normalizeBrand(word);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

/**
 * Get all brand variants for searching
 * Given a normalized brand, returns all variants that should match
 */
export function getBrandVariants(normalizedBrand: string): string[] {
  const upper = normalizedBrand.toUpperCase();
  const variants = new Set<string>([
    normalizedBrand,
    upper,
    normalizedBrand.replace(/ /g, "_"),
    upper.replace(/ /g, "_"),
    // Title case
    normalizedBrand.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" "),
    // Lower case
    normalizedBrand.toLowerCase(),
  ]);

  // Add all aliases if this is a canonical brand
  const aliases = BRAND_ALIASES[upper];
  if (aliases) {
    for (const alias of aliases) {
      variants.add(alias);
      variants.add(alias.toUpperCase());
      variants.add(alias.toLowerCase());
      variants.add(alias.replace(/_/g, " "));
      variants.add(alias.replace(/ /g, "_"));
    }
  }

  // Check if this matches any alias and add the canonical form
  const canonical = ALIAS_TO_CANONICAL.get(upper);
  if (canonical && canonical !== upper) {
    variants.add(canonical);
    variants.add(canonical.toLowerCase());
    variants.add(canonical.replace(/ /g, "_"));
  }

  return [...variants];
}
