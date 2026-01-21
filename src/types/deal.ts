export type Gender = "muski" | "zenski" | "deciji" | "unisex";

// Main categories
export type MainCategory = "obuca" | "odeca" | "oprema";

// Subcategories by main category
export type ObucaSubcategory = "patike" | "cipele" | "cizme" | "papuce" | "sandale" | "japanke" | "patofne" | "kopacke";
export type OdecaSubcategory = "jakne" | "prsluci" | "aktivni_ves" | "duksevi" | "majice" | "pantalone" | "trenerke" | "helanke" | "sortevi" | "kupaci" | "haljine" | "vetrovke" | "kosulje" | "kombinezoni";
export type OpremaSubcategory = "torbe" | "rancevi" | "kacketi" | "carape" | "kape" | "salovi" | "rukavice" | "vrece";

export type Subcategory = ObucaSubcategory | OdecaSubcategory | OpremaSubcategory;

// Full category path (e.g., "obuca/patike", "odeca/jakne")
export type CategoryPath = `${MainCategory}/${Subcategory}`;

// Legacy single category type for backwards compatibility
export type Category =
  | "patike"
  | "cipele"
  | "cizme"
  | "jakna"
  | "majica"
  | "duks"
  | "trenerka"
  | "sorc"
  | "helanke"
  | "ranac"
  | "ostalo";

// Raw deal from scraper (before enrichment)
export interface RawDeal {
  id: string;
  store: Store;
  name: string;
  brand: string | null;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  url: string;
  imageUrl: string | null;
  category: string | null;
  scrapedAt: Date;
  // Detail scraper fields (optional - added by detail-scraper)
  sizes?: string[];
  description?: string | null;
  detailImageUrl?: string | null;
  detailsScrapedAt?: Date;
  // Category and gender fields (added by detail-scraper)
  categories?: CategoryPath[];
  gender?: Gender;
}

// Enriched deal with gender and category
export interface Deal extends Omit<RawDeal, "category"> {
  category: Category;
  gender: Gender;
  categories?: CategoryPath[];
}

export type Store = "djaksport" | "planeta" | "sportvision" | "nsport" | "buzz" | "officeshoes";

export interface ScrapeResult {
  store: Store;
  deals: RawDeal[];
  totalScraped: number;
  filteredCount: number;
  scrapedAt: Date;
  errors: string[];
}
