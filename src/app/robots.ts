import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Allow product pages for indexing, and the image proxy so Googlebot-Image
        // can fetch the (hotlink-protected) product images it serves. The more
        // specific allow wins over the /api/ disallow in Google's matcher.
        allow: ["/", "/ponuda/", "/api/image-proxy"],
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
