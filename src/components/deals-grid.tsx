"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Deal, Store, Gender, Category } from "@/types/deal";
import { DealCard } from "./deal-card";
import { ScrollFade } from "./scroll-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DealsGridProps {
  deals: Deal[];
  brands: string[];
  stores: Store[];
  categories: Category[];
  priceRange: { min: number; max: number };
}

type SortOption = "discount" | "price-low" | "price-high" | "name";

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
  men: "Muškarci",
  women: "Žene",
  kids: "Deca",
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

export function DealsGrid({
  deals,
  brands,
  stores,
  categories,
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
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get("sort") as SortOption) || "discount"
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
  }, [search, selectedStores, selectedBrands, selectedGenders, selectedCategories, minDiscount, minPrice, maxPrice, sortBy, currentPage, pathname, router]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brands.slice(0, 20);
    return brands.filter((b) =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

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
        (deal) => deal.brand && selectedBrands.includes(deal.brand)
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

    result = result.filter((deal) => deal.discountPercent >= minDiscount);

    if (minPrice !== null) {
      result = result.filter((deal) => deal.salePrice >= minPrice);
    }

    if (maxPrice !== null) {
      result = result.filter((deal) => deal.salePrice <= maxPrice);
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
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
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

  const hasActiveFilters =
    search.length > 0 ||
    selectedStores.length > 0 ||
    selectedGenders.length > 0 ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    minDiscount > 50 ||
    minPrice !== null ||
    maxPrice !== null;

  const activeFilterCount =
    (search.length > 0 ? 1 : 0) +
    selectedStores.length +
    selectedGenders.length +
    selectedCategories.length +
    selectedBrands.length +
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
          className="bg-gray-50 border-gray-200 focus:bg-white"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
        >
          Resetuj filtere ✕
        </Button>
      )}

      {/* Discount Level */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Popust</h3>
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
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Cena (RSD)</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">Od</span>
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
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">Do</span>
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
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Pol</h3>
        <div className="flex flex-wrap gap-2">
          {(["men", "women", "kids", "unisex"] as Gender[]).map((gender) => (
            <button
              key={gender}
              onClick={() => toggleGender(gender)}
              className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedGenders.includes(gender)
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {GENDER_NAMES[gender]}
            </button>
          ))}
        </div>
      </div>

      {/* Store */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Prodavnica</h3>
        <div className="space-y-2">
          {stores.map((store) => (
            <label
              key={store}
              className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                selectedStores.includes(store)
                  ? "bg-red-50 border border-red-200"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedStores.includes(store)}
                onChange={() => toggleStore(store)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selectedStores.includes(store)
                  ? "bg-red-500 border-red-500"
                  : "border-gray-300"
              }`}>
                {selectedStores.includes(store) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">{STORE_NAMES[store]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Kategorija</h3>
        <p className="mb-3 text-xs text-gray-400">* Filteri nisu precizni</p>
        <ScrollFade maxHeight="200px">
          <div className="space-y-1 pr-1">
            {categories.map((category) => (
              <label
                key={category}
                className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedCategories.includes(category)
                    ? "bg-red-50 border border-red-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  selectedCategories.includes(category)
                    ? "bg-red-500 border-red-500"
                    : "border-gray-300"
                }`}>
                  {selectedCategories.includes(category) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700">{CATEGORY_NAMES[category]}</span>
              </label>
            ))}
          </div>
        </ScrollFade>
      </div>

      {/* Brand */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Brend</h3>
        <Input
          type="search"
          placeholder="Pretraži brendove..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="mb-3 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
        />
        <ScrollFade maxHeight="200px">
          <div className="space-y-1 pr-1">
            {filteredBrands.map((brand) => (
              <label
                key={brand}
                className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedBrands.includes(brand)
                    ? "bg-red-50 border border-red-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedBrands.includes(brand)
                    ? "bg-red-500 border-red-500"
                    : "border-gray-300"
                }`}>
                  {selectedBrands.includes(brand) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700 truncate">{brand}</span>
              </label>
            ))}
            {filteredBrands.length === 0 && (
              <p className="text-sm text-gray-400 p-2">Nema rezultata</p>
            )}
          </div>
        </ScrollFade>
      </div>
    </div>
  );

  return (
    <div>
      {/* Fixed Filter Tab Button - Left Side Top (mobile/tablet only) */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="fixed left-0 top-20 z-40 flex items-center gap-1 rounded-r-lg bg-red-500 px-2 py-3 text-white shadow-lg transition-all hover:bg-red-600 hover:pl-3 lg:hidden"
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
          <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-xl rounded-r-2xl animate-[slideInLeft_0.25s_ease-out] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b bg-white p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Filteri</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollFade maxHeight="100%" className="p-4 pb-8 h-full">
                {filterContentJSX}
              </ScrollFade>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* Desktop Sidebar - hidden on mobile/tablet */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <ScrollFade maxHeight="calc(100vh - 6rem)" className="p-5">
              {filterContentJSX}
            </ScrollFade>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Top Bar */}
          <div className="mb-4 flex items-center justify-end gap-4">
            <p className="text-sm text-gray-600">
              {filteredDeals.length} {filteredDeals.length === 1 ? "proizvod" : "proizvoda"}
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm"
            >
              <option value="discount">Sortiraj: Popust ↓</option>
              <option value="price-low">Sortiraj: Cena ↑</option>
              <option value="price-high">Sortiraj: Cena ↓</option>
              <option value="name">Sortiraj: Naziv</option>
            </select>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              {search && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
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
                  className="cursor-pointer"
                  onClick={() => toggleStore(store)}
                >
                  {STORE_NAMES[store]} ✕
                </Badge>
              ))}
              {selectedGenders.map((gender) => (
                <Badge
                  key={gender}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleGender(gender)}
                >
                  {GENDER_NAMES[gender]} ✕
                </Badge>
              ))}
              {selectedCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  {CATEGORY_NAMES[category]} ✕
                </Badge>
              ))}
              {selectedBrands.map((brand) => (
                <Badge
                  key={brand}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleBrand(brand)}
                >
                  {brand} ✕
                </Badge>
              ))}
              {minDiscount > 50 && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
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
                  className="cursor-pointer"
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
                  className="cursor-pointer"
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

          {/* Deals Grid */}
          {paginatedDeals.length === 0 ? (
            <div className="min-h-[400px] flex items-center justify-center text-gray-500">
              Nema proizvoda koji odgovaraju filterima
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
                  onClick={() => setCurrentPage(1)}
                  className="hidden sm:inline-flex"
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
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
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Dalje ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="hidden sm:inline-flex"
                >
                  »»
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Stranica {currentPage} od {totalPages} ({filteredDeals.length} proizvoda)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
