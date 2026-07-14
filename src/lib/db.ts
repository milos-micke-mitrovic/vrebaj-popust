import { PrismaClient } from "@prisma/client";
import { cache } from "react";

// This app runs in two different runtimes and each needs a different Prisma setup:
//
//  1. Cloudflare Workers (production, and local `cf:preview` via wrangler) — Prisma
//     talks to D1 through the @prisma/adapter-d1 adapter. The D1 binding only exists
//     inside a request, so the client MUST be created per-request. React `cache()`
//     scopes one client to one request; a module-level singleton would be reused
//     across requests and D1 throws "Cannot perform I/O on behalf of a different
//     request".
//
//  2. Node (build via `next build`, `next dev`, and the tsx scrapers/scripts) —
//     Prisma uses its normal library engine against the SQLite file in DATABASE_URL.
//     A process-wide singleton is correct here.
//
// Workers set `navigator.userAgent === "Cloudflare-Workers"`, which is how we tell
// the runtimes apart.

const isCloudflareWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

// --- Cloudflare Workers: per-request D1 client ---
const getWorkersPrisma = cache(async (): Promise<PrismaClient> => {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { PrismaD1 } = await import("@prisma/adapter-d1");
  const { env } = await getCloudflareContext({ async: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaD1((env as any).DB);
  return new PrismaClient({ adapter });
});

// --- Node: process-wide singleton against the SQLite file ---
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
function getNodePrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Get a Prisma client appropriate for the current runtime. Always `await` it —
 * on Workers it resolves a fresh per-request client, on Node the shared singleton.
 * Use this everywhere in the web app (pages, API routes, lib/deals).
 */
export async function getPrisma(): Promise<PrismaClient> {
  return isCloudflareWorkers ? getWorkersPrisma() : getNodePrisma();
}

/**
 * Node-only Prisma singleton for the scrapers/scripts (run via tsx, never on
 * Workers). Lazily created on first use so importing this module never spins up a
 * client in the Workers bundle. Property access is proxied to the real client and
 * methods are bound so `prisma.$disconnect()`, `prisma.$transaction(...)`, etc. work.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getNodePrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
