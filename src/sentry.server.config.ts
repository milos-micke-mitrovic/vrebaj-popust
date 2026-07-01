import * as Sentry from "@sentry/nextjs";

// Node server runtime. Errors only (tracesSampleRate 0) — this is where API route
// and server-component errors are captured.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
