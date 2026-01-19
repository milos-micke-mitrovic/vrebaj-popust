import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/ponuda/", // Individual product pages (noindexed, use filter pages instead)
        ],
      },
      {
        // Block aggressive scrapers
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot"],
        disallow: "/",
      },
    ],
    sitemap: "https://vrebajpopust.rs/sitemap.xml",
  };
}
