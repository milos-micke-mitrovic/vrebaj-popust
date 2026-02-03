/**
 * Safely serialize data for JSON-LD script tags.
 * Escapes closing script tags to prevent XSS from scraped data.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}
