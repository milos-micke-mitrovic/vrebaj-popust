import type { CategoryPath } from "@/types/deal";

/**
 * Normalize Serbian text: strip diacritics and lowercase.
 * This eliminates the need for duplicate variants (e.g., "čizme"/"cizme").
 */
export function normalizeSerbianText(text: string): string {
  return text
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .trim();
}

/**
 * Shared category mapper used by ALL scrapers.
 * Input text is normalized (diacritics stripped, lowercased) before matching.
 * Keywords use stem-based matching (e.g., "torb" matches torba/torbe/torbica).
 * Order matters: more specific patterns come before general ones.
 */
export function mapCategory(text: string): CategoryPath | null {
  // Strip domains from URLs to avoid false matches
  // (e.g., "buzzsneakers" matching "sneaker", "officeshoes" matching "shoe")
  const t = normalizeSerbianText(text.replace(/https?:\/\/[^\s\/]+/g, ""));

  // ── Early exclusions: catch items that would false-match other categories ──
  // e.g. "sock holder znojnica" would match carape via "sock"
  // e.g. "ulosci za patike" would match patike via "patik"
  if (t.includes("znojnic") || t.includes("headband") || t.includes("ulosc")) return null;

  // ── Footwear (specific before general) ──

  if (t.includes("kopack")) return "obuca/kopacke";
  if (t.includes("baletank")) return "obuca/baletanke";

  // "sneaker"/"trainer" appear in clothing names (e.g. "Sneaker Tee", "Trainer Hoodie")
  // so skip the footwear match when clothing keywords are also present
  const clothingContext = [
    "majic", "t-shirt", "tshirt", " tee", "duks", "hoodie", "sweatshirt",
    "jakn", "jacket", "sorc", "short", "pantalon", "pants", "helank",
    "trenerk", "prslu", "vest", "kosulj", "halj", "dress",
  ];
  const hasClothingKeyword = clothingContext.some((k) => t.includes(k));

  if (
    t.includes("patik") ||
    (t.includes("sneaker") && !hasClothingKeyword) ||
    t.includes("tenisic") ||
    (t.includes("trainer") && !hasClothingKeyword) ||
    t.includes("running") ||
    t.includes("patofn")
  ) return "obuca/patike";

  if (
    t.includes("cipel") ||
    t.includes("mokasine") ||
    t.includes("espadrile") ||
    (t.includes("shoe") && !t.includes("sneaker"))
  ) return "obuca/cipele";

  if (
    t.includes("cizm") ||
    t.includes("boot") ||
    t.includes("gumenjak") ||
    t.includes("gleznjac")
  ) return "obuca/cizme";

  if (t.includes("sandal")) return "obuca/sandale";

  if (
    t.includes("papuc") ||
    t.includes("japank") ||
    t.includes("klompe") ||
    t.includes("klompa") ||
    t.includes("flip flop") ||
    t.includes("slipper")
  ) return "obuca/papuce";

  // ── Clothing (specific before general) ──

  if (
    t.includes("kupac") ||
    t.includes("kupace") ||
    t.includes("bikini")
  ) return "odeca/kupaci";

  if (
    t.includes("kombinezon") ||
    t.includes("skafander") ||
    t.includes("jumpsuit") ||
    t.includes("overall")
  ) return "odeca/kombinezoni";

  // Tops/bras — before majice to avoid "top" falling through
  if (
    t.includes(" top") ||
    t.startsWith("top ") ||
    t.includes("sports bra") ||
    t.includes("tank top") ||
    t.includes("crop top") ||
    t.includes(" bra ") ||
    t.endsWith(" bra") ||
    t.startsWith("bra ")
  ) return "odeca/topovi";

  if (
    t.includes("jakn") ||
    t.includes("jacket") ||
    t.includes("vetrovk") ||
    t.includes("windbreak") ||
    t.includes("suskav") ||
    t.includes("puffer")
  ) return "odeca/jakne";

  if (
    t.includes("prslu") ||
    t.includes("vest")
  ) return "odeca/prsluci";

  if (
    t.includes("duks") ||
    t.includes("hoodie") ||
    t.includes("sweatshirt") ||
    t.includes("hudica")
  ) return "odeca/duksevi";

  if (
    t.includes("dzemp") ||
    t.includes("bluz") ||
    t.includes("pulover") ||
    t.includes("sweater") ||
    t.includes("cardigan") ||
    t.includes("kardigan") ||
    t.includes("sako")
  ) return "odeca/bluze";

  if (
    t.includes("majic") ||
    t.includes("t-shirt") ||
    t.includes("tshirt") ||
    t.includes("dres") ||
    t.includes("jersey")
  ) return "odeca/majice";

  if (
    t.includes("kosulj")
  ) return "odeca/kosulje";

  if (
    t.includes("helank") ||
    t.includes("tajic") ||
    t.includes("legging") ||
    t.includes("tight")
  ) return "odeca/helanke";

  if (
    t.includes("sorc") ||
    t.includes("sorts") ||
    t.includes("short") ||
    t.includes("bermud")
  ) return "odeca/sortevi";

  if (
    t.includes("pantalon") ||
    t.includes("pants") ||
    t.includes("trousers")
  ) return "odeca/pantalone";

  if (
    t.includes("bokseric") ||
    (t.includes("donj") && (t.includes("ves") || t.includes("deo")))
  ) return "odeca/donji-ves";

  if (
    t.includes("trenerk") ||
    t.includes("tracksuit")
  ) return "odeca/trenerke";

  if (
    t.includes("halj") ||
    t.includes("dress") ||
    t.includes("sukn") ||
    t.includes("skirt")
  ) return "odeca/haljine";

  // ── Accessories (rancevi merged into torbe) ──

  if (
    t.includes("novcanik") ||
    t.includes("wallet")
  ) return "oprema/novcanici";

  if (
    t.includes("ranac") ||
    t.includes("ranca") ||
    t.includes("rancev") ||
    t.includes("ruksak") ||
    t.includes("backpack") ||
    t.includes("torb") ||
    t.includes("duffel") ||
    t.includes("gym bag") ||
    t.includes("vrec") ||
    t.includes("gymsack")
  ) return "oprema/torbe";

  if (
    t.includes("kapa") ||
    t.includes("kape") ||
    t.includes("kacket") ||
    t.includes("sesir") ||
    t.includes("beanie") ||
    t.includes("silterica")
  ) return "oprema/kape";

  if (
    t.includes("rukavic") ||
    t.includes("gloves")
  ) return "oprema/rukavice";

  if (
    t.includes("carap") ||
    t.includes("stucn") ||
    t.includes("sock")
  ) return "oprema/carape";

  if (/\blopt/.test(t)) return "oprema/lopte";

  if (
    /\bsal\b/.test(t) ||
    t.includes("salov") ||
    t.includes("scarf")
  ) return "oprema/salovi";

  return null;
}
