import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Guard the init: on the Cloudflare Workers runtime the Node Sentry SDK is more
  // fragile than on a real Node server — if it ever fails to initialize, that must
  // not take down the whole app, so we swallow the error (losing only error capture).
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  } catch (err) {
    console.error("[sentry] init skipped:", err);
  }
}

// Captures errors thrown in server components, route handlers, etc.
export const onRequestError = Sentry.captureRequestError;
