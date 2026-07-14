import { describe, it, expect } from "vitest";
import { parseStringArray, stringifyStringArray, jsonArrayHasAny } from "./json-array";

describe("parseStringArray", () => {
  it("parses a JSON string array", () => {
    expect(parseStringArray('["42","43"]')).toEqual(["42", "43"]);
  });
  it("returns [] for null/undefined/empty", () => {
    expect(parseStringArray(null)).toEqual([]);
    expect(parseStringArray(undefined)).toEqual([]);
    expect(parseStringArray("")).toEqual([]);
  });
  it("returns [] for invalid JSON", () => {
    expect(parseStringArray("not json")).toEqual([]);
    expect(parseStringArray("{}")).toEqual([]);
  });
  it("drops non-string elements", () => {
    expect(parseStringArray('["a",1,null,"b"]')).toEqual(["a", "b"]);
  });
});

describe("stringifyStringArray", () => {
  it("serializes a string array", () => {
    expect(stringifyStringArray(["42", "43"])).toBe('["42","43"]');
  });
  it("serializes null/undefined as an empty array", () => {
    expect(stringifyStringArray(null)).toBe("[]");
    expect(stringifyStringArray(undefined)).toBe("[]");
    expect(stringifyStringArray([])).toBe("[]");
  });
  it("round-trips with parseStringArray", () => {
    const original = ["obuca/patike", "odeca/jakne"];
    expect(parseStringArray(stringifyStringArray(original))).toEqual(original);
  });
});

describe("jsonArrayHasAny", () => {
  it("builds an OR of exact-token contains fragments", () => {
    expect(jsonArrayHasAny("categories", ["obuca/patike", "odeca/jakne"])).toEqual({
      OR: [
        { categories: { contains: '"obuca/patike"' } },
        { categories: { contains: '"odeca/jakne"' } },
      ],
    });
  });
  it("wraps each value in quotes so it matches the exact JSON element", () => {
    // The token for size "36" is '"36"', which is NOT a substring of the element
    // "36-37" (stored as '"36-37"'), so exact matching holds.
    const frag = jsonArrayHasAny("sizes", ["36"]);
    expect(frag.OR[0].sizes.contains).toBe('"36"');
    expect('["36-37"]'.includes('"36"')).toBe(false);
    expect('["36","37"]'.includes('"36"')).toBe(true);
  });
  it("yields an always-false OR for no values", () => {
    expect(jsonArrayHasAny("sizes", [])).toEqual({ OR: [] });
  });
});
