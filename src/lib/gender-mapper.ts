import type { Gender } from "@/types/deal";
import { normalizeSerbianText } from "./category-mapper";

/**
 * Map structured gender text (e.g., from a "Pol" property table value) to Gender.
 * Returns null if no match found.
 */
export function mapGender(text: string): Gender | null {
  const t = normalizeSerbianText(text);

  // Kids — check first (most specific)
  if (
    t.includes("deca") ||
    t.includes("devoj") ||
    t.includes("kid") ||
    t.includes("junior") ||
    t.includes("beb")
  ) return "deciji";

  // Women
  if (
    t.includes("zensk") ||
    t.includes("women") ||
    t.includes("dame") ||
    t.includes("zene") ||
    t.includes("zena")
  ) return "zenski";

  // Men
  if (
    t.includes("musk") ||
    t.includes("men")
  ) return "muski";

  return null;
}

/**
 * Extract gender from product name and URL (free-form text).
 * Used as fallback when no structured gender data is available.
 * Always returns a value (defaults to "unisex").
 */
export function extractGenderFromNameUrl(name: string, url: string = ""): Gender {
  const t = normalizeSerbianText(`${name} ${url}`);

  // Kids — check first (most specific)
  if (
    t.includes("deca") ||
    t.includes("decij") ||
    t.includes("devoj") ||
    t.includes("kid") ||
    t.includes("junior") ||
    t.includes(" jr") ||
    t.includes("-jr-") ||
    t.includes(" bp") ||
    t.includes(" bg") ||
    t.includes(" ps") ||
    t.includes(" gs") ||
    t.includes(" td") ||
    t.includes(" youth") ||
    t.includes("beb") ||
    t.includes("infant") ||
    t.includes("toddler") ||
    t.includes("child")
  ) return "deciji";

  // Women
  if (
    t.includes("zensk") ||
    t.includes("zene") ||
    t.includes("zena") ||
    t.includes(" w ") ||
    t.endsWith(" w") ||
    t.includes("-w-") ||
    t.includes(" wmns") ||
    t.includes(" women") ||
    t.includes("woman") ||
    t.includes("/women/") ||
    t.includes("-women-") ||
    t.includes(" lady") ||
    t.includes(" ladies") ||
    t.includes("female") ||
    t.includes(" girl") ||
    t.includes("/girl/")
  ) return "zenski";

  // Men
  if (
    t.includes("musk") ||
    t.includes(" m ") ||
    t.endsWith(" m") ||
    t.includes("-m-") ||
    t.includes(" men ") ||
    t.includes(" men's") ||
    t.includes("/men/") ||
    t.includes("-men-") ||
    t.includes("male") ||
    t.includes(" guy")
  ) return "muski";

  return "unisex";
}
