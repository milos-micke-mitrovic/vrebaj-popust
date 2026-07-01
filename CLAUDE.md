# Project Rules for Claude

**VrebajPopust** (vrebajpopust.rs) is a Serbian sports-deals aggregator: nightly scrapers pull
products from 8 retailers, keep those discounted **50%+**, and serve them through a Next.js
storefront. Stack: **Next.js (App Router) + React + TypeScript + Tailwind**, **Prisma + PostgreSQL**,
**Puppeteer** scrapers, self-hosted on a **DigitalOcean VPS**.

> The maintainer prefers to review outcomes over reading code and defers engineering judgment to
> Claude. Make safe, well-reasoned decisions, keep the codebase lean, flag anything risky, and
> honestly say when something is *not* worth doing rather than manufacturing work.

## Git Commits
- Single-sentence commit messages. No co-author attribution. Only commit when work is complete.
- Always run `pnpm build` before committing (catches TypeScript/build errors).
- Run `pnpm test` before committing changes to logic in `src/lib/` (deploys are gated on tests).

## Deployment (IMPORTANT)
- **Self-hosted, NOT Vercel.** A DigitalOcean VPS runs Next.js via `pnpm start` under **pm2**
  (app name `vrebaj-popust`) behind **nginx**. App dir on the server: `/var/www/vrebaj-popust`.
- **Pushing to `main` auto-deploys** via `.github/workflows/deploy.yml` (a `test` job runs first,
  then SSH → `git reset --hard origin/main` → `pnpm install` → `pnpm build` → `pm2 restart`).
- **The user runs `git push` themselves.** Commit locally and stop; do NOT push unless asked.
- Do NOT hand-edit files on the server — the deploy's `git reset --hard` wipes them.
- Scraper code goes live on the next scheduled GitHub Actions run (GHA checks out latest `main`);
  only web-app changes need a deploy.

## Scrapers — the main source of breakage
- 8 store scrapers in `src/scraper/stores/*.ts` (+ `*-details.ts`). They break when a retailer
  changes markup or **rotates their sale-listing URL** (djaksport & planeta do this repeatedly).
- `src/scraper/health-check.ts` runs nightly and emails when a store drops below threshold.
- **When a store scrapes ~0 deals:** the sale URL almost certainly rotated. Find the current
  discount listing on the live site (puppeteer-stealth gets past Cloudflare) and update that
  store's `SALE_URL` / sale param. djaksport has self-healing URL discovery from its homepage.
- Every scraper: appends an md5 URL-hash suffix to the deal `id` (prevents unique-constraint
  collisions), and wraps each `upsertDeal` in try/catch (one bad product can't abort a run).

## Database
- Prisma + PostgreSQL. **Prod DB is on the VPS** (`localhost:5432`). The project uses
  `prisma db push` (no migrations) — schema changes need `prisma db push` run **on the server**
  (the deploy does NOT run it).
- **Local dev DB is on port `5433`** (the `.env` value). `.env.local`'s `5413` is stale/not running.
- **Backups:** a daily local `pg_dump` (cron, `scripts/db-backup.sh`) exists. The user deliberately
  declined off-site/paid backups — all deals are re-scrapable and contact messages don't matter.
  **Do not nag about backups.**

## Monitoring
- **Sentry** (`@sentry/nextjs`) captures runtime errors — errors-only config (no tracing/replay,
  no PII). DSN in the server `.env`. Source maps not uploaded yet (traces are minified).
- **health-check** monitors the scrape pipeline (above).

## Testing
- Vitest unit tests live next to the code as `src/**/*.test.ts` — they cover the pure business
  logic in `src/lib/` (brand extraction, filter/slug parsing, category & gender mapping,
  price/size/name normalization). Run with `pnpm test`. Update/extend them when changing that logic.

## Language & Code Style
- User-facing text is **Serbian**. Use "Najveći popusti" (not "Najbolji popusti").
  Avoid technical terms like "agregator" — use user-friendly wording.
- Follow existing patterns in the codebase.

## Development
- **Never start the dev server** — the user runs it themselves.
- Use **pnpm** (not npm).
