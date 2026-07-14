import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse price string to number
 * Handles Serbian price format: "12.990,00 RSD" -> 12990
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;

  const cleaned = priceStr
    .replace(/RSD|din|€|\s/gi, "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : Math.round(price);
}

/**
 * Calculate discount percentage
 */
export function calcDiscount(original: number, sale: number): number {
  if (original <= 0 || sale <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/**
 * Generate unique ID for a deal
 */
export function generateDealId(store: string, productUrl: string): string {
  const slug = productUrl
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .slice(0, 50);
  return `${store}-${slug}-${Date.now()}`;
}

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format price for display
 */
// Strip trailing SKU/model-code junk from scraped names (mainly Planeta), e.g.
// "ADIDAS Kopačke copa pure M - IE7492#41" -> "ADIDAS Kopačke copa pure M".
// Conservative: only removes a trailing " - CODE" whose code contains a digit,
// plus a trailing "#nn" marker — leaves clean names from other stores untouched.
export function cleanProductName(name: string): string {
  return name
    .replace(/\s*[-–]\s*[A-Za-z]*\d[A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)*(?:#[\d.]+)?\s*$/, "")
    .replace(/\s*#[\d.]+\s*$/, "")
    .trim();
}

// Title-case a (Serbian-Latin) string: "LA TERRA PATIKE" -> "La Terra Patike".
export function toTitleCase(s: string): string {
  return s
    .toLocaleLowerCase("sr-Latn")
    .replace(/(^|[\s\-/("])(\p{L})/gu, (_m, sep, ch) => sep + ch.toLocaleUpperCase("sr-Latn"));
}

// Display-ready product name: SKU junk removed and Title-Cased.
export function formatProductName(name: string): string {
  return toTitleCase(cleanProductName(name));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

const SITE_URL = "https://www.vrebajpopust.rs";

/**
 * Stores that hotlink-protect browser requests. They still allow no-referer
 * server-side fetches, which is how the Next image optimizer and our proxy reach
 * them — so on-page images use direct URLs, but crawler-facing URLs (OG/sitemap)
 * are routed through our own-domain proxy (see getAbsoluteImageUrl).
 */
const PROXY_IMAGE_DOMAINS = ["djaksport.com"];

/**
 * On-page image URL for use inside <Image>. On Cloudflare images are `unoptimized`
 * (no server-side optimizer on Workers), so the browser loads these URLs directly
 * and sends our referer. Hotlink-protected stores (djaksport) 403 that, so route
 * them through our own-domain proxy (fetched server-side with no referer, then
 * edge-cached). Other stores serve fine directly, so keep their URL to avoid an
 * extra hop. (The old "Next rejects a local URL with a query string" caveat only
 * applied to the optimizer, which is off now.)
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "/images/placeholder.png";
  if (PROXY_IMAGE_DOMAINS.some((domain) => imageUrl.includes(domain))) {
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}

/**
 * Absolute, crawlable image URL for OG tags and the image sitemap. Hotlink-protected
 * stores (djaksport) are routed through our own-domain proxy so Google Images and
 * social scrapers see the image on vrebajpopust.rs (crawlable per our robots.txt)
 * rather than the store's domain; other stores use their direct URL.
 */
export function getAbsoluteImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return `${SITE_URL}/images/placeholder.png`;
  if (imageUrl.startsWith("/")) return `${SITE_URL}${imageUrl}`;
  if (PROXY_IMAGE_DOMAINS.some((domain) => imageUrl.includes(domain))) {
    return `${SITE_URL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
