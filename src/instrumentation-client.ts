import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry. Errors-only: no performance tracing and no session replay,
// to keep the client bundle small and stay within quota on the small VPS.
// Sentry is a no-op when the DSN env var is absent (e.g. local builds).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
