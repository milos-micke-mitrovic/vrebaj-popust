import { MetadataRoute } from "next";
import { getAllDeals } from "@/lib/deals";

export default function sitemap(): MetadataRoute.Sitemap {
  const deals = getAllDeals();
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

  // Product pages - sorted by discount for priority
  const sortedDeals = [...deals].sort(
    (a, b) => b.discountPercent - a.discountPercent
  );

  const dealPages: MetadataRoute.Sitemap = sortedDeals.map((deal, index) => {
    // Higher discount = higher priority (0.9 for top deals, decreasing)
    const basePriority = 0.9;
    const priorityDecrease = Math.min(index * 0.001, 0.3);
    const priority = Math.max(basePriority - priorityDecrease, 0.5);

    return {
      url: `${baseUrl}/deal/${deal.id}`,
      lastModified: new Date(deal.scrapedAt),
      changeFrequency: "daily" as const,
      priority: Number(priority.toFixed(2)),
    };
  });

  return [...mainPages, ...dealPages];
}
