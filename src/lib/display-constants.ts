import type { Store, Gender, Category, MainCategory, Subcategory, CategoryPath } from "@/types/deal";

export const ITEMS_PER_PAGE = 32;

export const STORE_NAMES: Record<Store, string> = {
  djaksport: "Djak Sport",
  planeta: "Planeta Sport",
  sportvision: "Sport Vision",
  nsport: "N Sport",
  buzz: "Buzz Sneakers",
  officeshoes: "Office Shoes",
  intersport: "Intersport",
  trefsport: "Tref Sport",
};

export const GENDER_NAMES: Record<Gender, string> = {
  muski: "Muškarci",
  zenski: "Žene",
  deciji: "Deca",
  unisex: "Unisex",
};

export const CATEGORY_NAMES: Record<Category, string> = {
  patike: "Patike",
  cipele: "Cipele",
  cizme: "Čizme",
  jakna: "Jakne",
  majica: "Majice",
  duks: "Duksevi",
  trenerka: "Trenerke",
  sorc: "Šorcevi",
  helanke: "Helanke",
  ranac: "Torbe",
  ostalo: "Ostalo",
};

export const MAIN_CATEGORY_NAMES: Record<MainCategory, string> = {
  obuca: "Obuća",
  odeca: "Odeća",
  oprema: "Ostalo",
};

export const SUBCATEGORY_NAMES: Record<Subcategory, string> = {
  // Obuca
  patike: "Patike",
  cipele: "Cipele",
  baletanke: "Baletanke",
  cizme: "Čizme",
  papuce: "Papuče",
  sandale: "Sandale",
  kopacke: "Kopačke",
  // Odeca
  jakne: "Jakne",
  prsluci: "Prsluci",
  duksevi: "Duksevi",
  majice: "Majice",
  topovi: "Topovi",
  pantalone: "Pantalone",
  trenerke: "Trenerke",
  helanke: "Helanke",
  sortevi: "Šorcevi",
  kupaci: "Kupaći",
  haljine: "Haljine",
  kosulje: "Košulje",
  kombinezoni: "Kombinezoni",
  // Oprema
  torbe: "Torbe",
  carape: "Čarape",
  kape: "Kape",
  salovi: "Šalovi",
  rukavice: "Rukavice",
};

export const CATEGORY_HIERARCHY: Record<MainCategory, Subcategory[]> = {
  obuca: ["patike", "cipele", "baletanke", "cizme", "papuce", "sandale", "kopacke"],
  odeca: ["jakne", "prsluci", "duksevi", "majice", "topovi", "pantalone", "trenerke", "helanke", "sortevi", "kupaci", "haljine", "kosulje", "kombinezoni"],
  oprema: ["torbe", "carape", "kape", "salovi", "rukavice"],
};

// Build category path display names from hierarchy + subcategory names
export const CATEGORY_PATH_NAMES: Record<string, string> = Object.fromEntries(
  (Object.entries(CATEGORY_HIERARCHY) as [MainCategory, Subcategory[]][]).flatMap(
    ([main, subs]) => subs.map((sub) => [`${main}/${sub}`, SUBCATEGORY_NAMES[sub]])
  )
);

// Predefined sizes — always visible in filters
export const SHOE_SIZES = [
  "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
  "40", "41", "42", "43", "44", "45", "46",
];

export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];

// Filter options
export const DISCOUNT_LEVELS = [
  { value: 50, label: "50%+" },
  { value: 60, label: "60%+" },
  { value: 70, label: "70%+" },
  { value: 80, label: "80%+" },
];

export const PRICE_FROM_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "0" },
  { value: 2000, label: "2.000" },
  { value: 5000, label: "5.000" },
  { value: 10000, label: "10.000" },
];

export const PRICE_TO_OPTIONS: { value: number | null; label: string }[] = [
  { value: 3000, label: "3.000" },
  { value: 5000, label: "5.000" },
  { value: 10000, label: "10.000" },
  { value: 15000, label: "15.000" },
  { value: null, label: "Max." },
];
