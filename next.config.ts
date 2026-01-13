import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
