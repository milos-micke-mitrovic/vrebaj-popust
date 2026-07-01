// TEMPORARY: verifies Sentry captures server-side errors. Remove after confirming
// the test error shows up in the Sentry dashboard.
export function GET() {
  throw new Error("Sentry server test error (vrebajpopust) — safe to ignore");
}
