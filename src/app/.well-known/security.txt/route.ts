// RFC 9116 security.txt — a clear contact channel for vulnerability reports.
// Served at /.well-known/security.txt. Rendered per request so `Expires` is always
// ~1 year out and never lapses (RFC 9116 requires that field).
export const dynamic = "force-dynamic";

export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body =
    [
      "Contact: mailto:kontakt@vrebajpopust.rs",
      `Expires: ${expires}`,
      "Preferred-Languages: sr, en",
      "Canonical: https://www.vrebajpopust.rs/.well-known/security.txt",
    ].join("\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
