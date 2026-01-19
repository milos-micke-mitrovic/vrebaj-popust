import { NextRequest, NextResponse } from "next/server";

// Whitelist of allowed image domains (only our tracked stores)
const ALLOWED_DOMAINS = [
  "www.djaksport.com",
  "djaksport.com",
  "www.sportvision.rs",
  "sportvision.rs",
  "planetasport.rs",
  "www.planetasport.rs",
  "www.buzzsneakers.rs",
  "buzzsneakers.rs",
  "www.officeshoes.rs",
  "officeshoes.rs",
  "www.n-sport.net",
  "n-sport.net",
  // CDN domains commonly used by these stores
  "cdn.shopify.com",
  "images.sportsdirect.com",
];

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Security: Only allow whitelisted domains
  if (!isAllowedUrl(url)) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Don't send referer to bypass hotlink protection
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      },
    });
  } catch {
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
