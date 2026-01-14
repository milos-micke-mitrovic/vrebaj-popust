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
        hostname: "*.fashionandfriends.com",
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
