import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Force webpack for PWA support
  turbopack: {},
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
