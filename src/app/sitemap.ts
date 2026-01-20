import { MetadataRoute } from "next";
import { getAllDealsAsync } from "@/lib/deals";

// SEO filter pages - categories, brands, genders
const FILTER_PAGES = [
  // Categories
  "patike",
  "cipele",
  "cizme",
  "jakne",
  "trenerke",
  "majice",
  "duksevi",
  "sorcevi",
  "helanke",
  // Top Brands
  "nike",
  "adidas",
  "puma",
  "new-balance",
  "under-armour",
  "reebok",
  "converse",
  "fila",
  "champion",
  "vans",
  "skechers",
  "asics",
  "jordan",
  "the-north-face",
  "columbia",
  "hoka",
  "timberland",
  "lacoste",
  "tommy-hilfiger",
  "calvin-klein",
  "levis",
  "hummel",
  "umbro",
  "kappa",
  "ellesse",
  "diadora",
  "mizuno",
  "salomon",
  "crocs",
  // Genders
  "muski",
  "zenski",
  "deciji",
  // Stores
  "djaksport",
  "planeta-sport",
  "sport-vision",
  "n-sport",
  "buzz",
  "office-shoes",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.vrebajpopust.rs";
  const now = new Date();

  // Main pages
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ponude`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/o-nama`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privatnost`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/uslovi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Filter pages (categories, brands, genders) - permanent SEO pages
  const filterPages: MetadataRoute.Sitemap = FILTER_PAGES.map((filter) => ({
    url: `${baseUrl}/ponude/${filter}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Product pages - all active deals for long-tail SEO
  // These capture searches like "Nike Air Max 90 popust" etc.
  const deals = await getAllDealsAsync();
  const productPages: MetadataRoute.Sitemap = deals.map((deal) => ({
    url: `${baseUrl}/ponuda/${deal.id}`,
    lastModified: deal.scrapedAt ? new Date(deal.scrapedAt) : now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...mainPages, ...filterPages, ...productPages];
}
