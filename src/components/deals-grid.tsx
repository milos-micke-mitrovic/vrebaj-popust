"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Deal, Store, Gender, Category, CategoryPath, MainCategory, Subcategory } from "@/types/deal";
import { DealCard } from "./deal-card";
import { ScrollFade } from "./scroll-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchX } from "lucide-react";

// Brand normalization - must match ponude/page.tsx
const BRAND_ALIASES: Record<string, string> = {
  "CALVIN": "CALVIN KLEIN",
  "CALVIN KLEIN BLACK LABEL": "CALVIN KLEIN",
  "CALVIN KLEIN JEANS": "CALVIN KLEIN",
  "CK": "CALVIN KLEIN",
  "KARL": "KARL LAGERFELD",
  "NEW BALANCE": "NEW BALANCE",
  "TOMMY": "TOMMY HILFIGER",
  "TOMMY JEANS": "TOMMY HILFIGER",
};

function normalizeBrandForFilter(brand: string): string {
  let normalized = brand.replace(/_/g, " ").trim().toUpperCase();

  if (BRAND_ALIASES[normalized]) {
    return BRAND_ALIASES[normalized];
  }

  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (normalized.startsWith(alias + " ")) {
      return canonical;
    }
  }

  return normalized
    .split(" ")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

interface DealsGridProps {
  deals: Deal[];
  brands: string[];
  stores: Store[];
  categories: Category[];
  priceRange: { min: number; max: number };
}

type SortOption = "discount" | "price-low" | "price-high" | "newest";

const ITEMS_PER_PAGE = 32;

const STORE_NAMES: Record<Store, string> = {
  djaksport: "Djak Sport",
  planeta: "Planeta Sport",
  sportvision: "Sport Vision",
  nsport: "N Sport",
  buzz: "Buzz Sneakers",
  officeshoes: "Office Shoes",
};

const GENDER_NAMES: Record<Gender, string> = {
  muski: "Muškarci",
  zenski: "Žene",
  deciji: "Deca",
  unisex: "Unisex",
};

const CATEGORY_NAMES: Record<Category, string> = {
  patike: "Patike",
  cipele: "Cipele",
  cizme: "Čizme",
  jakna: "Jakne",
  majica: "Majice",
  duks: "Duksevi",
  trenerka: "Trenerke",
  sorc: "Šorcevi",
  helanke: "Helanke",
  ranac: "Ranci/Torbe",
  ostalo: "Ostalo",
};

// Hierarchical category structure
const MAIN_CATEGORY_NAMES: Record<MainCategory, string> = {
  obuca: "Obuća",
  odeca: "Odeća",
  oprema: "Oprema",
};

const SUBCATEGORY_NAMES: Record<Subcategory, string> = {
  // Obuca
  patike: "Patike",
  cipele: "Cipele",
  cizme: "Čizme",
  papuce: "Papuče",
  sandale: "Sandale",
  japanke: "Japanke",
  patofne: "Patofne",
  // Odeca
  jakne: "Jakne",
  prsluci: "Prsluci",
  aktivni_ves: "Aktivni veš",
  duksevi: "Duksevi",
  majice: "Majice",
  pantalone: "Pantalone",
  trenerke: "Trenerke",
  helanke: "Helanke",
  sortevi: "Šorcevi",
  kupaci: "Kupaći",
  haljine: "Haljine",
  vetrovke: "Vetrovke",
  // Oprema
  torbe: "Torbe",
  rancevi: "Rančevi",
  kacketi: "Kačketi",
  carape: "Čarape",
  kape: "Kape",
  salovi: "Šalovi",
  rukavice: "Rukavice",
  vrece: "Vreće",
};

const CATEGORY_HIERARCHY: Record<MainCategory, Subcategory[]> = {
  obuca: ["patike", "cipele", "cizme", "papuce", "sandale", "japanke", "patofne"],
  odeca: ["jakne", "prsluci", "aktivni_ves", "duksevi", "majice", "pantalone", "trenerke", "helanke", "sortevi", "kupaci", "haljine", "vetrovke"],
  oprema: ["torbe", "rancevi", "kacketi", "carape", "kape", "salovi", "rukavice", "vrece"],
};

export function DealsGrid({
  deals,
  brands,
  stores,
  categories: _categories,
  priceRange: _priceRange,
}: DealsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedStores, setSelectedStores] = useState<Store[]>(
    (searchParams.get("stores")?.split(",").filter(Boolean) as Store[]) || []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("brands")?.split(",").filter(Boolean) || []
  );
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(
    (searchParams.get("genders")?.split(",").filter(Boolean) as Gender[]) || []
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    (searchParams.get("categories")?.split(",").filter(Boolean) as Category[]) || []
  );
  const [selectedCategoryPaths, setSelectedCategoryPaths] = useState<CategoryPath[]>(
    (searchParams.get("catPaths")?.split(",").filter(Boolean) as CategoryPath[]) || []
  );
  const [expandedCategories, setExpandedCategories] = useState<MainCategory[]>([]);
  const [minDiscount, setMinDiscount] = useState(
    Number(searchParams.get("minDiscount")) || 50
  );
  const [minPrice, setMinPrice] = useState<number | null>(
    searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(
    searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null
  );
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get("sizes")?.split(",").filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    // First check URL, then localStorage, then default
    const urlSort = searchParams.get("sort") as SortOption;
    if (urlSort) return urlSort;
    if (typeof window !== "undefined") {
      const savedSort = localStorage.getItem("sortPreference") as SortOption;
      if (savedSort && ["discount", "price-low", "price-high", "newest"].includes(savedSort)) {
        return savedSort;
      }
    }
    return "discount";
  });
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Lock body scroll when mobile filters are open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileFilters]);

  // Restore scroll position when returning from product page
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("dealsScrollPosition");
    const clickedProductId = sessionStorage.getItem("dealsClickedProductId");

    if (savedScrollPosition) {
      // Small delay to ensure DOM is ready after hydration
      const timer = setTimeout(() => {
        // Try to scroll to the specific product card first
        if (clickedProductId) {
          const productCard = document.querySelector(`[href="/ponuda/${clickedProductId}"]`);
          if (productCard) {
            productCard.scrollIntoView({ behavior: "instant", block: "center" });
          } else {
            // Fallback to saved scroll position if product not visible (e.g., different page)
            window.scrollTo({ top: parseInt(savedScrollPosition, 10), behavior: "instant" });
          }
        } else {
          window.scrollTo({ top: parseInt(savedScrollPosition, 10), behavior: "instant" });
        }

        // Clear saved position after restoration
        sessionStorage.removeItem("dealsScrollPosition");
        sessionStorage.removeItem("dealsClickedProductId");
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem("sortPreference", sortBy);
  }, [sortBy]);

  // Track if we're updating from URL to prevent sync loops
  const isUpdatingFromUrl = useRef(false);
  const urlUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync state from URL params when URL changes externally (e.g., clicking logo to go home)
  // This is intentional - we need to sync external URL changes to local state
  useEffect(() => {
    // Build current state as URL params to compare
    const currentParams = new URLSearchParams();
    if (search) currentParams.set("q", search);
    if (selectedStores.length) currentParams.set("stores", selectedStores.join(","));
    if (selectedBrands.length) currentParams.set("brands", selectedBrands.join(","));
    if (selectedGenders.length) currentParams.set("genders", selectedGenders.join(","));
    if (selectedCategories.length) currentParams.set("categories", selectedCategories.join(","));
    if (selectedCategoryPaths.length) currentParams.set("catPaths", selectedCategoryPaths.join(","));
    if (selectedSizes.length) currentParams.set("sizes", selectedSizes.join(","));
    if (minDiscount > 50) currentParams.set("minDiscount", String(minDiscount));
    if (minPrice !== null) currentParams.set("minPrice", String(minPrice));
    if (maxPrice !== null) currentParams.set("maxPrice", String(maxPrice));
    if (sortBy !== "discount") currentParams.set("sort", sortBy);
    if (currentPage > 1) currentParams.set("page", String(currentPage));

    // Only sync if URL differs from current state (external navigation)
    if (currentParams.toString() !== searchParams.toString()) {
      isUpdatingFromUrl.current = true;
      /* eslint-disable react-hooks/set-state-in-effect */
      setSearch(searchParams.get("q") || "");
      setSelectedStores((searchParams.get("stores")?.split(",").filter(Boolean) as Store[]) || []);
      setSelectedBrands(searchParams.get("brands")?.split(",").filter(Boolean) || []);
      setSelectedGenders((searchParams.get("genders")?.split(",").filter(Boolean) as Gender[]) || []);
      setSelectedCategories((searchParams.get("categories")?.split(",").filter(Boolean) as Category[]) || []);
      setSelectedCategoryPaths((searchParams.get("catPaths")?.split(",").filter(Boolean) as CategoryPath[]) || []);
      setSelectedSizes(searchParams.get("sizes")?.split(",").filter(Boolean) || []);
      setMinDiscount(Number(searchParams.get("minDiscount")) || 50);
      setMinPrice(searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null);
      setMaxPrice(searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null);
      setSortBy((searchParams.get("sort") as SortOption) || "discount");
      setCurrentPage(Number(searchParams.get("page")) || 1);
      /* eslint-enable react-hooks/set-state-in-effect */
      // Reset flag after a short delay
      setTimeout(() => { isUpdatingFromUrl.current = false; }, 50);
    }
  }, [searchParams]);

  // Debounced URL update to prevent re-renders while typing/dragging
  useEffect(() => {
    // Skip if we're syncing from URL
    if (isUpdatingFromUrl.current) return;

    if (urlUpdateTimeout.current) {
      clearTimeout(urlUpdateTimeout.current);
    }

    urlUpdateTimeout.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (selectedStores.length) params.set("stores", selectedStores.join(","));
      if (selectedBrands.length) params.set("brands", selectedBrands.join(","));
      if (selectedGenders.length) params.set("genders", selectedGenders.join(","));
      if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
      if (selectedCategoryPaths.length) params.set("catPaths", selectedCategoryPaths.join(","));
      if (selectedSizes.length) params.set("sizes", selectedSizes.join(","));
      if (minDiscount > 50) params.set("minDiscount", String(minDiscount));
      if (minPrice !== null) params.set("minPrice", String(minPrice));
      if (maxPrice !== null) params.set("maxPrice", String(maxPrice));
      if (sortBy !== "discount") params.set("sort", sortBy);
      if (currentPage > 1) params.set("page", String(currentPage));

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => {
      if (urlUpdateTimeout.current) {
        clearTimeout(urlUpdateTimeout.current);
      }
    };
  }, [search, selectedStores, selectedBrands, selectedGenders, selectedCategories, selectedCategoryPaths, selectedSizes, minDiscount, minPrice, maxPrice, sortBy, currentPage, pathname, router]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brands;
    return brands.filter((b) =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  // Valid clothing sizes (in display order)
  const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];

  // Check if a size is a valid shoe size (18-50 range, including half sizes and fractions)
  const isShoeSize = (size: string): boolean => {
    // Skip range sizes like "23-26" or "S/M"
    if (size.includes("-") || size.includes("/")) return false;
    const num = parseFloat(size);
    if (isNaN(num)) return false;
    // Shoe sizes are typically 35-50 for adults, 18-34 for kids
    return num >= 18 && num <= 50;
  };

  // Extract unique sizes from all deals, separated by type
  const { shoeSizes, clothingSizes } = useMemo(() => {
    const shoes = new Set<string>();
    const clothes = new Set<string>();

    deals.forEach((deal) => {
      if (deal.sizes) {
        deal.sizes.forEach((size) => {
          // Check if it's a clothing size
          if (CLOTHING_SIZES.includes(size.toUpperCase())) {
            clothes.add(size);
          }
          // Check if it's a shoe size
          else if (isShoeSize(size)) {
            shoes.add(size);
          }
          // Skip invalid sizes like "ADULT", "BV", single digits, kids height sizes (128, 140, etc.)
        });
      }
    });

    // Sort shoe sizes numerically
    const sortedShoes = Array.from(shoes).sort((a, b) => parseFloat(a) - parseFloat(b));

    // Sort clothing sizes by predefined order
    const sortedClothes = Array.from(clothes).sort((a, b) => {
      const aIndex = CLOTHING_SIZES.indexOf(a.toUpperCase());
      const bIndex = CLOTHING_SIZES.indexOf(b.toUpperCase());
      return aIndex - bIndex;
    });

    return { shoeSizes: sortedShoes, clothingSizes: sortedClothes };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    let result = [...deals];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (deal) =>
          deal.name.toLowerCase().includes(searchLower) ||
          (deal.brand && deal.brand.toLowerCase().includes(searchLower))
      );
    }

    if (selectedStores.length > 0) {
      result = result.filter((deal) => selectedStores.includes(deal.store));
    }

    if (selectedBrands.length > 0) {
      result = result.filter(
        (deal) => deal.brand && selectedBrands.includes(normalizeBrandForFilter(deal.brand))
      );
    }

    if (selectedGenders.length > 0) {
      result = result.filter((deal) => selectedGenders.includes(deal.gender));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((deal) =>
        selectedCategories.includes(deal.category)
      );
    }

    // Filter by new category paths (from detail scraper)
    if (selectedCategoryPaths.length > 0) {
      result = result.filter((deal) => {
        if (!deal.categories || deal.categories.length === 0) return false;
        return selectedCategoryPaths.some((path) => deal.categories?.includes(path));
      });
    }

    result = result.filter((deal) => deal.discountPercent >= minDiscount);

    if (minPrice !== null) {
      result = result.filter((deal) => deal.salePrice >= minPrice);
    }

    if (maxPrice !== null) {
      result = result.filter((deal) => deal.salePrice <= maxPrice);
    }

    if (selectedSizes.length > 0) {
      result = result.filter(
        (deal) => deal.sizes && deal.sizes.some((dealSize) => {
          // Check each selected size
          return selectedSizes.some((selectedSize) => {
            // Exact match
            if (dealSize === selectedSize) return true;
            // Range match: "36-37" matches if user selected "36" or "37"
            if (dealSize.includes("-")) {
              const parts = dealSize.split("-");
              return parts.includes(selectedSize);
            }
            return false;
          });
        })
      );
    }

    switch (sortBy) {
      case "discount":
        result.sort((a, b) => b.discountPercent - a.discountPercent);
        break;
      case "price-low":
        result.sort((a, b) => a.salePrice - b.salePrice);
        break;
      case "price-high":
        result.sort((a, b) => b.salePrice - a.salePrice);
        break;
      case "newest":
        // Reverse order - newest items are at the end of the data array
        result.reverse();
        break;
    }

    return result;
  }, [
    deals,
    search,
    selectedStores,
    selectedBrands,
    selectedGenders,
    selectedCategories,
    selectedCategoryPaths,
    selectedSizes,
    minDiscount,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const totalPages = Math.ceil(filteredDeals.length / ITEMS_PER_PAGE);
  const paginatedDeals = filteredDeals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSelectedStores([]);
    setSelectedBrands([]);
    setSelectedGenders([]);
    setSelectedCategories([]);
    setSelectedCategoryPaths([]);
    setSelectedSizes([]);
    setMinDiscount(50);
    setMinPrice(null);
    setMaxPrice(null);
    setSearch("");
    setBrandSearch("");
    setCurrentPage(1);
  };

  const toggleStore = (store: Store) => {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
    setCurrentPage(1);
  };

  const toggleGender = (gender: Gender) => {
    setSelectedGenders((prev) =>
      prev.includes(gender)
        ? prev.filter((g) => g !== gender)
        : [...prev, gender]
    );
    setCurrentPage(1);
  };

  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
    setCurrentPage(1);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
    setCurrentPage(1);
  };

  const toggleCategoryPath = (path: CategoryPath) => {
    setSelectedCategoryPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
    setCurrentPage(1);
  };

  const toggleExpandedCategory = (cat: MainCategory) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleMainCategory = (mainCat: MainCategory) => {
    const subcats = CATEGORY_HIERARCHY[mainCat];
    const paths = subcats.map((sub) => `${mainCat}/${sub}` as CategoryPath);
    const allSelected = paths.every((p) => selectedCategoryPaths.includes(p));

    if (allSelected) {
      // Deselect all subcategories of this main category
      setSelectedCategoryPaths((prev) => prev.filter((p) => !paths.includes(p)));
    } else {
      // Select all subcategories of this main category
      setSelectedCategoryPaths((prev) => [...new Set([...prev, ...paths])]);
    }
    setCurrentPage(1);
  };

  // Handle page change with scroll to top
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    search.length > 0 ||
    selectedStores.length > 0 ||
    selectedGenders.length > 0 ||
    selectedCategories.length > 0 ||
    selectedCategoryPaths.length > 0 ||
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    minDiscount > 50 ||
    minPrice !== null ||
    maxPrice !== null;

  const activeFilterCount =
    (search.length > 0 ? 1 : 0) +
    selectedStores.length +
    selectedGenders.length +
    selectedCategories.length +
    selectedCategoryPaths.length +
    selectedBrands.length +
    selectedSizes.length +
    (minDiscount > 50 ? 1 : 0) +
    (minPrice !== null ? 1 : 0) +
    (maxPrice !== null ? 1 : 0);

  // Discount level options
  const discountLevels = [
    { value: 50, label: "50%+" },
    { value: 60, label: "60%+" },
    { value: 70, label: "70%+" },
    { value: 80, label: "80%+" },
  ];

  // Price range options - "from"
  const priceFromOptions = [
    { value: null, label: "0" },
    { value: 2000, label: "2.000" },
    { value: 5000, label: "5.000" },
    { value: 10000, label: "10.000" },
  ];

  // Price range options - "to"
  const priceToOptions = [
    { value: 3000, label: "3.000" },
    { value: 5000, label: "5.000" },
    { value: 10000, label: "10.000" },
    { value: 15000, label: "15.000" },
    { value: null, label: "Max" },
  ];

  // Filter content JSX - rendered directly to avoid re-creating on each render
  const filterContentJSX = (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Input
          type="search"
          placeholder="Pretraži proizvode..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-gray-50 border-gray-200 focus:bg-white dark:bg-gray-800 dark:border-gray-700 dark:focus:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          Resetuj filtere ✕
        </Button>
      )}

      {/* Discount Level */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Popust</h3>
        <div className="flex flex-wrap gap-2">
          {discountLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => {
                setMinDiscount(minDiscount === level.value ? 50 : level.value);
                setCurrentPage(1);
              }}
              className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors ${
                minDiscount === level.value
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Cena (RSD)</h3>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">Od</span>
            <div className="flex flex-wrap gap-1.5">
              {priceFromOptions.map((option) => (
                <button
                  key={`from-${option.label}`}
                  onClick={() => {
                    setMinPrice(option.value);
                    setCurrentPage(1);
                  }}
                  className={`cursor-pointer px-2.5 py-1 text-xs rounded-full transition-colors ${
                    minPrice === option.value
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">Do</span>
            <div className="flex flex-wrap gap-1.5">
              {priceToOptions.map((option) => (
                <button
                  key={`to-${option.label}`}
                  onClick={() => {
                    setMaxPrice(option.value);
                    setCurrentPage(1);
                  }}
                  className={`cursor-pointer px-2.5 py-1 text-xs rounded-full transition-colors ${
                    maxPrice === option.value
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gender */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Pol</h3>
        <div className="flex flex-wrap gap-2">
          {(["muski", "zenski", "deciji", "unisex"] as Gender[]).map((gender) => (
            <button
              key={gender}
              onClick={() => toggleGender(gender)}
              className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedGenders.includes(gender)
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {GENDER_NAMES[gender]}
            </button>
          ))}
        </div>
      </div>

      {/* Store */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Prodavnica</h3>
        <div className="space-y-1">
          {stores.map((store) => (
            <button
              key={store}
              type="button"
              onClick={() => toggleStore(store)}
              className={`flex w-full cursor-pointer items-center gap-2 p-1.5 rounded-lg transition-colors text-left ${
                selectedStores.includes(store)
                  ? "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                selectedStores.includes(store)
                  ? "bg-red-500 border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}>
                {selectedStores.includes(store) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{STORE_NAMES[store]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category - Hierarchical */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Kategorija</h3>
        <div className="space-y-2">
          {(Object.keys(CATEGORY_HIERARCHY) as MainCategory[]).map((mainCat) => {
            const subcats = CATEGORY_HIERARCHY[mainCat];
            const paths = subcats.map((sub) => `${mainCat}/${sub}` as CategoryPath);
            const selectedCount = paths.filter((p) => selectedCategoryPaths.includes(p)).length;
            const allSelected = selectedCount === paths.length;
            const someSelected = selectedCount > 0 && selectedCount < paths.length;
            const isExpanded = expandedCategories.includes(mainCat);

            return (
              <div key={mainCat} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Main category header */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => toggleMainCategory(mainCat)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                      allSelected
                        ? "bg-red-500 border-red-500"
                        : someSelected
                        ? "bg-red-200 border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {(allSelected || someSelected) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpandedCategory(mainCat)}
                    className="flex-1 flex items-center justify-between cursor-pointer text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {MAIN_CATEGORY_NAMES[mainCat]}
                      {selectedCount > 0 && (
                        <span className="ml-2 text-xs text-red-500">({selectedCount})</span>
                      )}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="p-2 space-y-1 bg-white dark:bg-gray-900">
                    {subcats.map((subcat) => {
                      const path = `${mainCat}/${subcat}` as CategoryPath;
                      const isSelected = selectedCategoryPaths.includes(path);

                      return (
                        <button
                          key={subcat}
                          type="button"
                          onClick={() => toggleCategoryPath(path)}
                          className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-red-50 dark:bg-red-900/20"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-red-500 border-red-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{SUBCATEGORY_NAMES[subcat]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shoe Size */}
      {shoeSizes.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Veličina obuće</h3>
          <ScrollFade maxHeight="120px">
            <div className="flex flex-wrap gap-1.5 pr-1">
              {shoeSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`cursor-pointer px-2.5 py-1 text-xs rounded-full transition-colors ${
                    selectedSizes.includes(size)
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </ScrollFade>
        </div>
      )}

      {/* Clothing Size */}
      {clothingSizes.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Veličina odeće</h3>
          <div className="flex flex-wrap gap-1.5">
            {clothingSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`cursor-pointer px-2.5 py-1 text-xs rounded-full transition-colors ${
                  selectedSizes.includes(size)
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Brend</h3>
        <Input
          type="search"
          placeholder="Pretraži brendove..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="mb-3 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white dark:bg-gray-800 dark:border-gray-700 dark:focus:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
          <div className="space-y-0.5 pr-1">
            {filteredBrands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={`flex w-full cursor-pointer items-center gap-2 p-1.5 rounded-lg transition-colors text-left ${
                  selectedBrands.includes(brand)
                    ? "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  selectedBrands.includes(brand)
                    ? "bg-red-500 border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}>
                  {selectedBrands.includes(brand) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{brand}</span>
              </button>
            ))}
            {filteredBrands.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 p-2">Nema rezultata</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Fixed Filter Tab Button - Left Side Top (mobile/tablet only) */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="cursor-pointer fixed left-0 top-20 z-40 flex items-center gap-1 rounded-r-lg bg-red-500 px-2 py-3 text-white shadow-lg transition-all hover:bg-red-600 hover:pl-3 lg:hidden"
        aria-label="Otvori filtere"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-red-500">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filter Drawer - Left Side */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-white dark:bg-gray-900 shadow-xl rounded-r-2xl animate-[slideInLeft_0.25s_ease-out] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold dark:text-white">Filteri</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-8">
              {filterContentJSX}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* Desktop Sidebar - hidden on mobile/tablet */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin p-5">
              {filterContentJSX}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Top Bar - Sort and Active Filters */}
          <div className="mb-4">
            {/* Desktop/Tablet: Single row */}
            <div className="sm:flex sm:items-center sm:gap-4">
              {/* Active Filters - left side on sm+, with padding for toggle button on tablet */}
              {hasActiveFilters && (
                <div className="hidden sm:flex sm:flex-1 flex-wrap gap-2 pl-14 lg:pl-0">
                  {search && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => {
                        setSearch("");
                        setCurrentPage(1);
                      }}
                    >
                      Pretraga: &quot;{search}&quot; ✕
                    </Badge>
                  )}
                  {selectedStores.map((store) => (
                    <Badge
                      key={store}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleStore(store)}
                    >
                      {STORE_NAMES[store]} ✕
                    </Badge>
                  ))}
                  {selectedGenders.map((gender) => (
                    <Badge
                      key={gender}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleGender(gender)}
                    >
                      {GENDER_NAMES[gender]} ✕
                    </Badge>
                  ))}
                  {selectedCategories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleCategory(category)}
                    >
                      {CATEGORY_NAMES[category]} ✕
                    </Badge>
                  ))}
                  {selectedCategoryPaths.map((path) => {
                    const [, sub] = path.split("/") as [MainCategory, Subcategory];
                    return (
                      <Badge
                        key={path}
                        variant="secondary"
                        className="cursor-pointer px-3 py-1.5 text-sm"
                        onClick={() => toggleCategoryPath(path)}
                      >
                        {SUBCATEGORY_NAMES[sub]} ✕
                      </Badge>
                    );
                  })}
                  {selectedBrands.map((brand) => (
                    <Badge
                      key={brand}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleBrand(brand)}
                    >
                      {brand} ✕
                    </Badge>
                  ))}
                  {selectedSizes.map((size) => (
                    <Badge
                      key={size}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleSize(size)}
                    >
                      Vel. {size} ✕
                    </Badge>
                  ))}
                  {minDiscount > 50 && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => {
                        setMinDiscount(50);
                        setCurrentPage(1);
                      }}
                    >
                      Min {minDiscount}% ✕
                    </Badge>
                  )}
                  {minPrice !== null && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => {
                        setMinPrice(null);
                        setCurrentPage(1);
                      }}
                    >
                      Od {minPrice.toLocaleString()} RSD ✕
                    </Badge>
                  )}
                  {maxPrice !== null && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => {
                        setMaxPrice(null);
                        setCurrentPage(1);
                      }}
                    >
                      Do {maxPrice.toLocaleString()} RSD ✕
                    </Badge>
                  )}
                </div>
              )}

              {/* Sort and count - right side, full width when no filters */}
              <div className={`flex items-center justify-end gap-4 ${hasActiveFilters ? "sm:flex-shrink-0" : "w-full"}`}>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredDeals.length} {filteredDeals.length === 1 ? "proizvod" : "proizvoda"}
                </p>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
                >
                  <option value="discount">Sortiraj: Popust ↓</option>
                  <option value="price-low">Sortiraj: Cena ↑</option>
                  <option value="price-high">Sortiraj: Cena ↓</option>
                  <option value="newest">Sortiraj: Najnovije</option>
                </select>
              </div>
            </div>

            {/* Mobile: Active filters below sort */}
            {hasActiveFilters && (
              <div className="mt-3 flex sm:hidden flex-wrap gap-2">
                {search && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => {
                      setSearch("");
                      setCurrentPage(1);
                    }}
                  >
                    Pretraga: &quot;{search}&quot; ✕
                  </Badge>
                )}
                {selectedStores.map((store) => (
                  <Badge
                    key={store}
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleStore(store)}
                  >
                    {STORE_NAMES[store]} ✕
                  </Badge>
                ))}
                {selectedGenders.map((gender) => (
                  <Badge
                    key={gender}
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleGender(gender)}
                  >
                    {GENDER_NAMES[gender]} ✕
                  </Badge>
                ))}
                {selectedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleCategory(category)}
                  >
                    {CATEGORY_NAMES[category]} ✕
                  </Badge>
                ))}
                {selectedCategoryPaths.map((path) => {
                  const [, sub] = path.split("/") as [MainCategory, Subcategory];
                  return (
                    <Badge
                      key={path}
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => toggleCategoryPath(path)}
                    >
                      {SUBCATEGORY_NAMES[sub]} ✕
                    </Badge>
                  );
                })}
                {selectedBrands.map((brand) => (
                  <Badge
                    key={brand}
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleBrand(brand)}
                  >
                    {brand} ✕
                  </Badge>
                ))}
                {selectedSizes.map((size) => (
                  <Badge
                    key={size}
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleSize(size)}
                  >
                    Vel. {size} ✕
                  </Badge>
                ))}
                {minDiscount > 50 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => {
                      setMinDiscount(50);
                      setCurrentPage(1);
                    }}
                  >
                    Min {minDiscount}% ✕
                  </Badge>
                )}
                {minPrice !== null && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => {
                      setMinPrice(null);
                      setCurrentPage(1);
                    }}
                  >
                    Od {minPrice.toLocaleString()} RSD ✕
                  </Badge>
                )}
                {maxPrice !== null && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => {
                      setMaxPrice(null);
                      setCurrentPage(1);
                    }}
                  >
                    Do {maxPrice.toLocaleString()} RSD ✕
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Deals Grid */}
          {paginatedDeals.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <SearchX className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nema rezultata
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Nismo pronašli proizvode koji odgovaraju tvojim filterima. Probaj da prilagodiš pretragu.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Resetuj filtere
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {paginatedDeals.map((deal) => (
                <div key={deal.id} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]">
                  <DealCard deal={deal} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(1)}
                  className="hidden sm:inline-flex"
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  ‹ Nazad
                </Button>

                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-9 h-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Dalje ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  className="hidden sm:inline-flex"
                >
                  »»
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Prikazano {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDeals.length)} od {filteredDeals.length} proizvoda
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
