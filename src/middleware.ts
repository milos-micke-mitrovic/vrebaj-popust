import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Redirect non-www to www
  if (hostname === "vrebajpopust.rs") {
    const url = request.nextUrl.clone();
    url.host = "www.vrebajpopust.rs";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)",
  ],
};
