// Shared HTML fetch for the plain-fetch list scrapers. Retries transient failures
// (ECONNRESET / "fetch failed", 429, 5xx) so a single network blip mid-pagination
// doesn't end the run early and silently truncate a store's deals.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "sr-RS,sr;q=0.9,en;q=0.8",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchHtml(url: string, tries = 3): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) return await response.text();
      const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
      // 4xx (other than 429) won't fix itself on retry.
      if (response.status !== 429 && response.status < 500) throw Object.assign(err, { fatal: true });
      lastErr = err;
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal) throw e;
      lastErr = e;
    }
    if (i < tries - 1) await sleep(2000 * (i + 1));
  }
  throw lastErr;
}
