import { describe, it, expect } from "vitest";
import { extractBrandFromName, normalizeBrand } from "./brand-utils";

describe("extractBrandFromName", () => {
  it("extracts a single leading brand word", () => {
    expect(extractBrandFromName("NIKE Air Max 90")).toBe("NIKE");
    expect(extractBrandFromName("KAPPA Trenerka Banda")).toBe("KAPPA");
  });

  it("keeps known multi-word brands whole (regression: LA TERRA must not become LA)", () => {
    expect(extractBrandFromName("LA TERRA Patike ken M")).toBe("LA TERRA");
    expect(extractBrandFromName("THE NORTH FACE Jakna")).toBe("THE NORTH FACE");
    expect(extractBrandFromName("SERGIO TACCHINI Patike Motion")).toBe("SERGIO TACCHINI");
  });

  it("resolves aliases to the canonical brand", () => {
    expect(extractBrandFromName("HML Patike Court")).toBe("HUMMEL");
  });

  it("does not treat gender/category words as a brand", () => {
    expect(extractBrandFromName("MUŠKA MAJICA Basic")).toBeNull();
  });
});

describe("normalizeBrand", () => {
  it("uppercases and replaces underscores", () => {
    expect(normalizeBrand("adidas")).toBe("ADIDAS");
    expect(normalizeBrand("MOON_BOOT")).toBe("MOON BOOT");
  });
  it("merges aliases to canonical", () => {
    expect(normalizeBrand("CALVIN")).toBe("CALVIN KLEIN");
  });
  it("rejects gender and category words", () => {
    expect(normalizeBrand("MUSKA")).toBeNull();
    expect(normalizeBrand("PATIKE")).toBeNull();
  });
});
