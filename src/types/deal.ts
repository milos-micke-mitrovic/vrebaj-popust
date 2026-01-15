export type Gender = "men" | "women" | "kids" | "unisex";

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
}

// Enriched deal with gender and category
export interface Deal extends Omit<RawDeal, "category"> {
  category: Category;
  gender: Gender;
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
