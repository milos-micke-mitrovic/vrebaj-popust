import { describe, it, expect } from "vitest";
import { mapCategory } from "./category-mapper";
import { mapGender, extractGenderFromNameUrl } from "./gender-mapper";

describe("mapCategory", () => {
  it("maps footwear keywords to obuca paths", () => {
    expect(mapCategory("Nike Patike Air Max")).toBe("obuca/patike");
    expect(mapCategory("Kožne cipele")).toBe("obuca/cipele");
    expect(mapCategory("Zimske čizme")).toBe("obuca/cizme");
    expect(mapCategory("Kopačke za fudbal")).toBe("obuca/kopacke");
  });

  it("excludes false-match traps (insoles, headbands)", () => {
    expect(mapCategory("Ulošci za patike")).toBeNull();
  });

  it("does not classify clothing with 'sneaker' in the name as footwear", () => {
    // "Sneaker" + a clothing keyword must NOT resolve to obuca/patike
    expect(mapCategory("Sneaker majica")).not.toBe("obuca/patike");
  });
});

describe("mapGender", () => {
  it("detects men / women / kids", () => {
    expect(mapGender("Muška majica")).toBe("muski");
    expect(mapGender("Ženske patike")).toBe("zenski");
    expect(mapGender("Junior patike")).toBe("deciji");
  });
  it("returns null when no gender is present", () => {
    expect(mapGender("Obična lopta")).toBeNull();
  });
});

describe("extractGenderFromNameUrl", () => {
  it("defaults to unisex when nothing matches", () => {
    expect(extractGenderFromNameUrl("Univerzalna kapa", "")).toBe("unisex");
  });
  it("picks up gender from the name", () => {
    expect(extractGenderFromNameUrl("Muške patike", "")).toBe("muski");
  });
});
