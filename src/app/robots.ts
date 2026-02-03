import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ponuda/"], // Allow product pages for indexing
        disallow: [
          "/api/",
          "/admin",
          "/_next/",
        ],
      },
      {
        // Block aggressive scrapers
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot"],
        disallow: "/",
      },
    ],
    sitemap: "https://www.vrebajpopust.rs/sitemap.xml",
  };
}
