import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content Security Policy
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self, inline (Next.js needs it), Google Analytics, Cloudflare Web Analytics beacon
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
  // Styles: self, inline (Tailwind)
  "style-src 'self' 'unsafe-inline'",
  // Images: allow all https sources (stores use various CDNs that change)
  "img-src 'self' data: blob: https: http:",
  // Fonts: self and Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Connections: self, Google Analytics, Sentry error ingest (EU region), Cloudflare Web Analytics
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://o4511659032707072.ingest.de.sentry.io https://cloudflareinsights.com",
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

  // Cloudflare/OpenNext: keep Prisma out of the bundle so OpenNext can patch the
  // client for the workerd runtime (otherwise it crashes scanning for engines).
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

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
      // NOTE: the non-www -> www redirect was removed here. On OpenNext/Workers a
      // Next.js redirect with `:path*` does not substitute for the root path, so it
      // emits a literal `/:path*` and every page enters a redirect loop. Apex->www
      // canonicalization is handled at the edge (a Cloudflare Redirect Rule) instead,
      // and the app already emits `<link rel="canonical">` to the www URL.
    ];
  },

  // Compress responses
  compress: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,
  images: {
    // Cloudflare/Workers: Next's image optimizer (sharp) can't run on the edge, so
    // serve source images as-is. Cloudflare's CDN still caches/delivers them. (The
    // remotePatterns below are moot with unoptimized but kept for local Node dev.)
    unoptimized: true,
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
      // OfficeShoes actually serves product images from cdn.officeshoes.ws.
      {
        protocol: "https",
        hostname: "cdn.officeshoes.ws",
      },
      {
        protocol: "https",
        hostname: "*.officeshoes.ws",
      },
      // Bare planetasport.rs apex — `*.planetasport.rs` does not match a host
      // with no subdomain, which is the host Planeta stores on its deals.
      {
        protocol: "https",
        hostname: "planetasport.rs",
      },
      {
        protocol: "https",
        hostname: "www.intersport.rs",
      },
      {
        protocol: "https",
        hostname: "*.intersport.rs",
      },
      {
        protocol: "https",
        hostname: "trefsport.com",
      },
      {
        protocol: "https",
        hostname: "*.trefsport.com",
      },
    ],
  },
};

// Wrap with Sentry. No source-map upload yet (no auth token) — errors are still
// captured, just with minified stack traces; add SENTRY_AUTH_TOKEN later to upload
// source maps. No tunnelRoute: events go straight to Sentry (CSP is widened above)
// rather than routing through the small VPS.
export default withSentryConfig(nextConfig, {
  org: "vrebajpopust",
  project: "vrebajpopust",
  silent: !process.env.CI,
  disableLogger: true,
});
