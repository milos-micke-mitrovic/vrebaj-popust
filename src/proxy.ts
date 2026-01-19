import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Known bot/scraper user agents to block (but allow search engines)
const BLOCKED_USER_AGENTS = [
  "python-requests",
  "python-urllib",
  "scrapy",
  "curl",
  "wget",
  "httpie",
  "postman",
  "insomnia",
  "axios",
  "node-fetch",
  "go-http-client",
  "java",
  "httpclient",
  "libwww",
  "lwp-trivial",
  "php",
  "ruby",
  "perl",
];

// Check if user agent looks like a bot/scraper
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // No user agent = suspicious

  const ua = userAgent.toLowerCase();

  // Allow search engines
  if (ua.includes("googlebot") || ua.includes("bingbot") || ua.includes("yandex")) {
    return false;
  }

  // Block known scrapers
  return BLOCKED_USER_AGENTS.some(bot => ua.includes(bot));
}

// Simple in-memory rate limiting (for single-server deployment)
// For multi-server, use Redis instead
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 100; // requests per window (allows quick page navigation)
const RATE_LIMIT_WINDOW = 3 * 1000; // 3 seconds - burst protection

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

export function proxy(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const userAgent = request.headers.get("user-agent");

    // Block known bots/scrapers (except image-proxy which needs to work)
    if (!request.nextUrl.pathname.startsWith("/api/image-proxy") && isBot(userAgent)) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting
    const key = getRateLimitKey(request);
    if (isRateLimited(key)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "3",
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
