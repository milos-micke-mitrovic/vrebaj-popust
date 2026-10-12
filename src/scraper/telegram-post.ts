// Posts the day's top fresh deals to a Telegram channel. Runs in the nightly workflow
// after the scrape, so the channel gets a daily drop of the biggest NEW discounts with
// zero manual work. Links point at our own product pages (traffic comes to the site first,
// then out to the store). No-ops cleanly if the Telegram secrets aren't set yet.
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (@handle or -100… id),
//      INGEST_URL, INGEST_SECRET, optional SITE_URL / TELEGRAM_COUNT.
import "dotenv/config";

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const INGEST_URL = process.env.INGEST_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;
const SITE = process.env.SITE_URL || "https://www.vrebajpopust.rs";
const COUNT = Number(process.env.TELEGRAM_COUNT || 5);

interface TopDeal {
  id: string;
  store: string;
  name: string;
  brand: string | null;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  url: string;
  imageUrl: string | null;
  detailImageUrl: string | null;
}

const STORE_NAMES: Record<string, string> = {
  djaksport: "Djak Sport",
  sportvision: "Sport Vision",
  nsport: "N Sport",
  buzz: "Buzz",
  officeshoes: "Office Shoes",
  intersport: "Intersport",
  trefsport: "Tref Sport",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => Math.round(n).toLocaleString("de-DE"); // dot thousands: 1.234
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Retry transient network failures (ECONNRESET etc. between the GHA runner and the
// Worker / Telegram's API happen occasionally and shouldn't abort the post).
async function fetchRetry(url: string, opts: RequestInit, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, opts);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

async function tg(method: string, payload: unknown): Promise<{ ok: boolean; description?: string }> {
  const r = await fetchRetry(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json() as Promise<{ ok: boolean; description?: string }>;
}

async function main(): Promise<void> {
  if (!BOT || !CHANNEL) {
    console.log("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not set — skipping Telegram post.");
    return;
  }
  if (!INGEST_URL || !INGEST_SECRET) {
    console.log("INGEST_URL / INGEST_SECRET not set — cannot fetch deals.");
    return;
  }

  const res = await fetchRetry(INGEST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${INGEST_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getTopDeals", limit: COUNT, sinceHours: 30, minDiscount: 60 }),
  });
  if (!res.ok) {
    console.error(`getTopDeals failed: HTTP ${res.status}`);
    process.exitCode = 1;
    return;
  }
  const { deals } = (await res.json()) as { deals: TopDeal[] };
  if (!deals?.length) {
    console.log("No fresh 60%+ deals to post today.");
    return;
  }

  console.log(`Posting ${deals.length} deals to Telegram ${CHANNEL}...`);
  let posted = 0;
  for (const d of deals) {
    const store = STORE_NAMES[d.store] || d.store;
    const title = esc(d.name.trim());
    const brandLine = d.brand ? `🏷️ ${esc(d.brand)} · ${store}` : `🏷️ ${store}`;
    const caption =
      `🔥 <b>${title}</b>\n\n` +
      `💸 <b>-${d.discountPercent}%</b>  •  <s>${fmt(d.originalPrice)} RSD</s> → <b>${fmt(d.salePrice)} RSD</b>\n` +
      brandLine;
    const img = d.detailImageUrl || d.imageUrl;
    // Route through our image-proxy so Telegram can always fetch it (handles store hotlink).
    const photo = img ? `${SITE}/api/image-proxy?url=${encodeURIComponent(img)}` : null;
    const dealUrl = `${SITE}/ponuda/${d.id}`;
    const reply_markup = { inline_keyboard: [[{ text: "👉 Pogledaj ponudu", url: dealUrl }]] };

    try {
      let r: { ok: boolean; description?: string } | null = null;
      if (photo) {
        r = await tg("sendPhoto", { chat_id: CHANNEL, photo, caption, parse_mode: "HTML", reply_markup });
      }
      if (!r?.ok) {
        // Photo missing or Telegram couldn't fetch it → fall back to a text post.
        r = await tg("sendMessage", {
          chat_id: CHANNEL,
          text: `${caption}\n\n${dealUrl}`,
          parse_mode: "HTML",
          reply_markup,
        });
      }
      if (r?.ok) {
        posted++;
        console.log(`  ✓ -${d.discountPercent}%  ${d.name.slice(0, 45)}`);
      } else {
        console.error(`  ✗ ${d.name.slice(0, 45)}: ${r?.description || "unknown error"}`);
      }
    } catch (e) {
      console.error(`  ✗ ${d.name.slice(0, 45)}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(2500); // be gentle with Telegram's channel rate limit
  }
  console.log(`Done. Posted ${posted}/${deals.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
