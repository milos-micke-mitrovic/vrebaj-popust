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
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Stores that have hotlink protection and need image proxying
 */
const PROXY_IMAGE_DOMAINS = ["djaksport.com"];

/**
 * Get image URL, using proxy for stores with hotlink protection
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "/images/placeholder.png";

  // Check if image needs proxying based on domain
  const needsProxy = PROXY_IMAGE_DOMAINS.some((domain) => imageUrl.includes(domain));

  if (needsProxy) {
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  return imageUrl;
}
