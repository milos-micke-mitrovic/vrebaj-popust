import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Known bot/scraper user agents to block from the API (search engines allowed).
// This used to live in the edge middleware/proxy, but Next 16's Proxy runs on the
// Node runtime, which OpenNext/Cloudflare can't execute — so the stateless part
// (UA blocking) moved here, called at the top of API handlers. Rate-limiting is now
// handled by Cloudflare's edge (WAF / rate-limiting rules), which is far more
// effective than the old per-process in-memory counter.
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

/** True if the user agent looks like a bot/scraper (missing UA is treated as suspicious). */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  if (ua.includes("googlebot") || ua.includes("bingbot") || ua.includes("yandex")) {
    return false;
  }
  return BLOCKED_USER_AGENTS.some((bot) => ua.includes(bot));
}

/**
 * Returns a 403 response if the request looks like a bot/scraper, otherwise null.
 * Call at the start of a public API handler: `const blocked = blockBots(request); if (blocked) return blocked;`
 */
export function blockBots(request: NextRequest): NextResponse | null {
  if (isBot(request.headers.get("user-agent"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
