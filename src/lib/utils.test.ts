import { describe, it, expect } from "vitest";
import {
  parsePrice,
  calcDiscount,
  cleanProductName,
  toTitleCase,
  formatProductName,
  getProxiedImageUrl,
  getAbsoluteImageUrl,
} from "./utils";

describe("parsePrice", () => {
  it("parses Serbian-formatted prices (dot thousands, comma decimals)", () => {
    expect(parsePrice("12.990,00 RSD")).toBe(12990);
    expect(parsePrice("1.299 din")).toBe(1299);
    expect(parsePrice("7.999,00")).toBe(7999);
  });
  it("handles plain integers and currency symbols", () => {
    expect(parsePrice("5299")).toBe(5299);
    expect(parsePrice("€ 49")).toBe(49);
  });
  it("returns 0 for empty or non-numeric input", () => {
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("nema cene")).toBe(0);
  });
});

describe("calcDiscount", () => {
  it("computes rounded percentage off", () => {
    expect(calcDiscount(1000, 500)).toBe(50);
    expect(calcDiscount(7999, 5299)).toBe(34);
  });
  it("guards against zero/invalid prices", () => {
    expect(calcDiscount(0, 500)).toBe(0);
    expect(calcDiscount(1000, 0)).toBe(0);
  });
});

describe("cleanProductName", () => {
  it("strips trailing SKU/model-code junk (Planeta)", () => {
    expect(cleanProductName("LA TERRA Patike ken M - TRF253M103-92#43")).toBe("LA TERRA Patike ken M");
    expect(cleanProductName("ADIDAS Kopačke f50 pro fg M - IE0599#40.5")).toBe("ADIDAS Kopačke f50 pro fg M");
  });
  it("leaves clean names untouched", () => {
    expect(cleanProductName("KAPPA TRENERKA 222 BANDA")).toBe("KAPPA TRENERKA 222 BANDA");
    expect(cleanProductName("Nike Air Max 90")).toBe("Nike Air Max 90");
  });
});

describe("toTitleCase", () => {
  it("title-cases ALL-CAPS names including Serbian letters", () => {
    expect(toTitleCase("LA TERRA PATIKE")).toBe("La Terra Patike");
    expect(toTitleCase("ČIZME ŽENSKE ĐON")).toBe("Čizme Ženske Đon");
  });
});

describe("formatProductName", () => {
  it("cleans SKU junk and title-cases in one step", () => {
    expect(formatProductName("LA TERRA Patike ken M - TRF253M103-92#43")).toBe("La Terra Patike Ken M");
    expect(formatProductName("KAPPA TRENERKA 222 BANDA")).toBe("Kappa Trenerka 222 Banda");
  });
});

describe("image url helpers", () => {
  it("getProxiedImageUrl returns the direct url (optimizer fetches it)", () => {
    expect(getProxiedImageUrl("https://www.djaksport.com/x.jpg")).toBe("https://www.djaksport.com/x.jpg");
    expect(getProxiedImageUrl(null)).toBe("/images/placeholder.png");
  });
  it("getAbsoluteImageUrl proxies hotlink-protected djaksport for crawlers, direct otherwise", () => {
    expect(getAbsoluteImageUrl("https://www.djaksport.com/x.jpg")).toContain("/api/image-proxy?url=");
    expect(getAbsoluteImageUrl("https://www.n-sport.net/x.jpg")).toBe("https://www.n-sport.net/x.jpg");
  });
});
