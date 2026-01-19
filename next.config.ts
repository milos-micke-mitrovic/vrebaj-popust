import type { NextConfig } from "next";
import withPWA from "next-pwa";

// Content Security Policy
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self, inline (Next.js needs it), Google Analytics
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  // Styles: self, inline (Tailwind)
  "style-src 'self' 'unsafe-inline'",
  // Images: self, data URIs, blob, and all store domains
  "img-src 'self' data: blob: https://www.djaksport.com https://djaksport.com https://planeta.rs https://*.planeta.rs https://planetasport.rs https://*.planetasport.rs https://sportvision.rs https://*.sportvision.rs https://www.sportvision.rs https://n-sport.net https://*.n-sport.net https://www.n-sport.net https://buzzsneakers.rs https://*.buzzsneakers.rs https://www.buzzsneakers.rs https://officeshoes.rs https://*.officeshoes.rs https://www.officeshoes.rs https://www.google-analytics.com",
  // Fonts: self and Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Connections: self, Google Analytics
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
  // Frames: none (prevent embedding)
  "frame-ancestors 'none'",
  // Base URI and form actions restricted to self
  "base-uri 'self'",
  "form-action 'self'",
  // Workers for PWA service worker
  "worker-src 'self'",
  // Manifest for PWA
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Force webpack for PWA support
  turbopack: {},

  // Hide X-Powered-By header (don't reveal it's Next.js)
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy
          { key: "Content-Security-Policy", value: cspDirectives },
          // HSTS - Force HTTPS for 1 year, include subdomains
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy (disable unused features)
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Cache static assets for 1 year
        source: "/logos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

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

  // Compress responses
  compress: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,
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
