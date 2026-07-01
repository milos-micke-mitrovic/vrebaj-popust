import { describe, it, expect } from "vitest";
import { parseFilterSlug, generateSeoTitle, brandDisplay } from "./filter-parser";

describe("parseFilterSlug", () => {
  it("resolves single-word brand slugs", () => {
    const p = parseFilterSlug("joma");
    expect(p.isValid).toBe(true);
    expect(p.brand).toBe("JOMA");
  });

  it("resolves multi-word brand slugs (la-terra, sergio-tacchini)", () => {
    expect(parseFilterSlug("la-terra").brand).toBe("LA TERRA");
    expect(parseFilterSlug("sergio-tacchini").brand).toBe("SERGIO TACCHINI");
  });

  it("resolves brand + category combos", () => {
    const p = parseFilterSlug("la-terra-patike");
    expect(p.brand).toBe("LA TERRA");
    expect(p.category).toBe("patike");
  });

  it("resolves gender + category and store slugs", () => {
    const g = parseFilterSlug("muski-patike");
    expect(g.gender).toBe("muski");
    expect(g.category).toBe("patike");
    expect(parseFilterSlug("djak-sport").store).toBe("djaksport");
  });

  it("marks an empty/unknown slug invalid", () => {
    expect(parseFilterSlug("").isValid).toBe(false);
  });
});

describe("generateSeoTitle / brandDisplay", () => {
  it("title-cases brands so titles are not spammy ALL-CAPS", () => {
    expect(brandDisplay("LA TERRA")).toBe("La Terra");
    expect(brandDisplay("NIKE")).toBe("Nike");
  });
  it("builds a readable landing-page title", () => {
    expect(generateSeoTitle(parseFilterSlug("joma"))).toBe("Joma na popustu");
    expect(generateSeoTitle(parseFilterSlug("nike-patike"))).toBe("Nike patike na popustu");
  });
});
