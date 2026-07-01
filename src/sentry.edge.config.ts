import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware). Errors only.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
