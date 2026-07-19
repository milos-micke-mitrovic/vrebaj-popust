#!/usr/bin/env node
// One-command health sweep for vrebaj-popust (site, Worker errors, scraper runs,
// catalog, SEO). Lets "is everything ok?" be a single command instead of ad-hoc
// queries each time. No secrets baked in — reads them from the environment:
//   CLOUDFLARE_API_TOKEN=...   (Workers-analytics + D1 read; the migration token has it)
//   GSC_KEY=/path/to/gsc-service-account.json   (optional; SEO check — defaults to
//                                                ~/Downloads/jamogu-auth-*.json)
//   DAYS=2                     (optional; error/analytics window, default 2)
// Run:  CLOUDFLARE_API_TOKEN=$(cat <tokenfile>) node scripts/ops-check.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const ACCT = "2fb3d178d5f36a51bbee103ec69d3ef7";
const WORKER = "vrebaj-popust";
const DB_ID = "5ffae0d7-fc3d-4c66-8a12-2ebe1e735d87";
const SITE = "https://www.vrebajpopust.rs";
const GSC_SITE = "sc-domain:vrebajpopust.rs";
const DAYS = Number(process.env.DAYS || 2);

// CF API token: env var wins; otherwise fall back to a durable, gitignored file
// (~/.config/vrebaj-popust/cf_token) so the sweep is a true one-command with nothing
// to paste. Mirrors the GSC key handling — the ephemeral scratchpad copy kept vanishing.
function resolveToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const durable = path.join(os.homedir(), ".config", "vrebaj-popust", "cf_token");
  try {
    const t = fs.readFileSync(durable, "utf8").trim();
    if (t) return t;
  } catch { /* ignore */ }
  return undefined;
}
const TOKEN = resolveToken();

const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const ok = (b) => (b ? "✅" : "⚠️");

async function cfGraphQL(query) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

async function d1(sql) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result[0].results;
}

function resolveGscKey() {
  if (process.env.GSC_KEY && fs.existsSync(process.env.GSC_KEY)) return process.env.GSC_KEY;
  // Durable, gitignored home path — the reliable default. (macOS TCC blocks node from
  // listing ~/Downloads, so the old auto-find there silently fails; keep it as a fallback.)
  const durable = path.join(os.homedir(), ".config", "vrebaj-popust", "gsc-key.json");
  if (fs.existsSync(durable)) return durable;
  const dl = path.join(os.homedir(), "Downloads");
  try {
    const f = fs.readdirSync(dl).find((n) => /jamogu-auth.*\.json$/.test(n));
    if (f) return path.join(dl, f);
  } catch { /* ignore */ }
  return null;
}

async function gscToken(keyPath) {
  const KEY = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  const inp =
    b64(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64(JSON.stringify({ iss: KEY.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: KEY.token_uri, iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(inp).sign(KEY.private_key);
  const r = await (await fetch(KEY.token_uri, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: inp + "." + b64(sig) }),
  })).json();
  return r.access_token;
}

async function main() {
  console.log(`\n=== vrebaj-popust health sweep (${new Date().toISOString().slice(0, 16)}Z, ${DAYS}d window) ===\n`);

  // 1. Site up
  try {
    const r = await fetch(SITE + "/", { headers: { "User-Agent": "ops-check" } });
    const body = await r.json().catch(() => null);
    console.log(`${ok(r.status === 200)} site: HTTP ${r.status} (server: ${r.headers.get("server")})`);
  } catch (e) { console.log(`⚠️ site: ${e.message}`); }

  // Catalog count (public API, no token needed)
  try {
    const j = await (await fetch(SITE + "/api/deals", { headers: { "User-Agent": "ops-check" } })).json();
    console.log(`   catalog: ${j.pagination.total} deals, ${j.filters.brands.length} brands, ${j.filters.stores.length} stores`);
  } catch (e) { console.log(`   catalog: ${e.message}`); }

  if (!TOKEN) { console.log("\n(no CLOUDFLARE_API_TOKEN — skipping Worker errors + scraper runs)"); }
  else {
    // 2. Worker errors + recent hourly shape
    try {
      const d = await cfGraphQL(`query { viewer { accounts(filter: {accountTag: "${ACCT}"}) {
        workersInvocationsAdaptive(limit: 100, filter: {scriptName: "${WORKER}", datetime_geq: "${iso(daysAgo(DAYS))}", datetime_leq: "${iso(new Date())}"}) { sum { requests errors } }
      } } }`);
      const rows = d.viewer.accounts[0].workersInvocationsAdaptive;
      const errs = rows.reduce((a, r) => a + r.sum.errors, 0);
      const reqs = rows.reduce((a, r) => a + r.sum.requests, 0);
      console.log(`${ok(errs === 0)} worker: ${reqs} requests, ${errs} errors (${DAYS}d)`);

      // Hourly shape over the last 24h — localizes errors and surfaces traffic spikes
      // that a multi-day total hides. This token only has the flat workersInvocationsAdaptive
      // (not the ...Groups variant), so we fan out one query per hour (in parallel).
      const hourSum = async (h) => {
        const a = iso(new Date(Date.now() - h * 3600000));
        const b = iso(new Date(Date.now() - (h - 1) * 3600000));
        const r = await cfGraphQL(`query { viewer { accounts(filter: {accountTag: "${ACCT}"}) {
          workersInvocationsAdaptive(limit: 1, filter: {scriptName: "${WORKER}", datetime_geq: "${a}", datetime_leq: "${b}"}) { sum { requests errors } }
        } } }`);
        const n = r.viewer.accounts[0].workersInvocationsAdaptive;
        return { hour: a.slice(11, 13), requests: n[0]?.sum.requests || 0, errors: n[0]?.sum.errors || 0 };
      };
      const hours = await Promise.all(Array.from({ length: 24 }, (_, i) => hourSum(24 - i)));
      const errHours = hours.filter((h) => h.errors > 0);
      if (errHours.length) console.log(`     ↳ errors (24h) at ${errHours.map((h) => `${h.hour}:00 (${h.errors})`).join(", ")} UTC`);
      const sorted = hours.map((h) => h.requests).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const peak = hours.reduce((m, h) => (h.requests > m.requests ? h : m), hours[0]);
      if (peak.requests > 3 * Math.max(median, 1) && peak.requests > 1000) {
        console.log(`     ↳ ⚠️ busiest hour ${peak.hour}:00 UTC = ${peak.requests} reqs (typical ~${median}/h) — check for a bot/crawler burst`);
      }
    } catch (e) { console.log(`⚠️ worker analytics: ${e.message}`); }

    // 3. Scraper runs — latest per store + which stores ran in the last 26h
    try {
      const rows = await d1(`SELECT store, filteredCount AS deals, length(errors) AS errlen, startedAt FROM ScrapeRun ORDER BY startedAt DESC LIMIT 40`);
      const cutoff = iso(daysAgo(1.1));
      const latest = {};
      for (const r of rows) if (!latest[r.store]) latest[r.store] = r;
      const stores = Object.values(latest).sort((a, b) => a.store.localeCompare(b.store));
      const ranRecently = stores.filter((s) => s.startedAt > cutoff).length;
      const withErrors = stores.filter((s) => (s.errlen || 0) > 2);
      console.log(`${ok(ranRecently >= 8 && withErrors.length === 0)} scrapers: ${ranRecently}/8 stores ran in last ~26h, ${withErrors.length} with errors`);
      for (const s of stores) {
        const stale = s.startedAt <= cutoff ? " (STALE)" : "";
        console.log(`     ${s.store.padEnd(12)} ${String(s.deals).padStart(5)} deals  ${s.startedAt.slice(0, 16)}${stale}${(s.errlen || 0) > 2 ? "  ⚠️ERR" : ""}`);
      }
    } catch (e) { console.log(`⚠️ scraper runs: ${e.message}`); }
  }

  // 4. SEO (GSC) — last 7 days totals
  const key = resolveGscKey();
  if (!key) { console.log("\n(no GSC key found — skipping SEO; set GSC_KEY=/path/to/key.json)"); }
  else {
    try {
      const t = await gscToken(key);
      const r = await (await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
        method: "POST", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: iso(daysAgo(9)).slice(0, 10), endDate: iso(daysAgo(2)).slice(0, 10) }),
      })).json();
      const row = (r.rows || [])[0];
      if (row) console.log(`\n📈 SEO (7d to -2d): ${Math.round(row.clicks)} clicks, ${Math.round(row.impressions)} impressions, ${(row.ctr * 100).toFixed(1)}% CTR, avg pos ${row.position.toFixed(1)}`);
      else console.log("\n📈 SEO: no rows");
    } catch (e) { console.log(`\n⚠️ SEO (GSC): ${e.message}`); }
  }
  console.log("");
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
