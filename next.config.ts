import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Force webpack for PWA support
  turbopack: {},
  // Redirects for old URLs (SEO - preserve link juice)
  async redirects() {
    return [
      // Old /deal/ URLs redirect to /ponuda/
      {
        source: "/deal/:id",
        destination: "/ponuda/:id",
        permanent: true, // 301 redirect - tells Google to update index
      },
      // Ensure www and non-www consistency (redirect non-www to www)
      {
        source: "/:path*",
        has: [{ type: "host", value: "vrebajpopust.rs" }],
        destination: "https://www.vrebajpopust.rs/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.djaksport.com",
      },
      {
        protocol: "https",
        hostname: "djaksport.com",
      },
      {
        protocol: "https",
        hostname: "*.planeta.rs",
      },
      {
        protocol: "https",
        hostname: "*.planetasport.rs",
      },
      {
        protocol: "https",
        hostname: "*.sportvision.rs",
      },
      {
        protocol: "https",
        hostname: "www.sportvision.rs",
      },
      {
        protocol: "https",
        hostname: "*.n-sport.net",
      },
      {
        protocol: "https",
        hostname: "www.n-sport.net",
      },
      {
        protocol: "https",
        hostname: "*.buzzsneakers.rs",
      },
      {
        protocol: "https",
        hostname: "www.buzzsneakers.rs",
      },
      {
        protocol: "https",
        hostname: "*.officeshoes.rs",
      },
      {
        protocol: "https",
        hostname: "www.officeshoes.rs",
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default pwaConfig(nextConfig);
