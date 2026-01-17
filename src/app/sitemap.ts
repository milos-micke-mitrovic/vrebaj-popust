import { MetadataRoute } from "next";

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
  // Brands
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
  // Genders
  "muski",
  "zenski",
  "deciji",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://vrebajpopust.rs";
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

  // Note: Individual product pages (/ponuda/[id]) are not included
  // because they are noindexed - they change too frequently

  return [...mainPages, ...filterPages];
}
