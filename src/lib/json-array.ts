// SQLite/D1 has no array columns, so `Deal.sizes`/`Deal.categories` and
// `ScrapeRun.errors` are stored as JSON-encoded TEXT (e.g. '["42","43"]'). These
// helpers are the single place that (de)serializes them, so the rest of the app
// keeps working with `string[]`.

/** Parse a JSON-array TEXT column into a string[]. Tolerant of null/garbage. */
export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Serialize a string[] into a JSON-array TEXT value for storage. */
export function stringifyStringArray(value: string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

/**
 * Build a Prisma `where` fragment that matches rows whose JSON-array TEXT column
 * contains ANY of `values` — the SQLite/D1 stand-in for `{ hasSome: values }`.
 *
 * Each value is matched as its exact JSON token (quotes included), so
 * `"obuca/patike"` matches the element "obuca/patike" but never "obuca/patike-x"
 * or a substring of a longer element. Returns a `{ OR: [...] }` fragment (empty
 * `values` yields an always-false `{ OR: [] }`).
 */
export function jsonArrayHasAny(
  field: "categories" | "sizes",
  values: string[]
): { OR: Record<string, { contains: string }>[] } {
  return { OR: values.map((v) => ({ [field]: { contains: JSON.stringify(v) } })) };
}
