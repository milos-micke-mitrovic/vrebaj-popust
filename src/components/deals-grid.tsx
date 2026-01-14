"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Deal, Store, Gender, Category } from "@/types/deal";
import { DealCard } from "./deal-card";
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

const ITEMS_PER_PAGE = 30;

const STORE_NAMES: Record<Store, string> = {
  djaksport: "Djak Sport",
  planeta: "Planeta Sport",
  sportvision: "Sport Vision",
  nsport: "N Sport",
  buzz: "Buzz Sneakers",
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
  priceRange,
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

  // Debounced URL update to prevent re-renders while typing/dragging
  const urlUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounce URL updates by 300ms
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
  }, [search, selectedStores, selectedBrands, selectedGenders, selectedCategories, minDiscount, maxPrice, sortBy, currentPage, pathname, router]);

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
    selectedStores.length > 0 ||
    selectedGenders.length > 0 ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    minDiscount > 50 ||
    maxPrice !== null;

  const activeFilterCount =
    selectedStores.length +
    selectedGenders.length +
    selectedCategories.length +
    selectedBrands.length +
    (minDiscount > 50 ? 1 : 0) +
    (maxPrice !== null ? 1 : 0);

  // Filter content JSX - rendered directly to avoid re-creating on each render
  const filterContentJSX = (
    <div className="space-y-5">
      <div>
        <Input
          type="search"
          placeholder="Pretraži proizvode..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Pol</h3>
        <div className="space-y-1.5">
          {(["men", "women", "kids", "unisex"] as Gender[]).map((gender) => (
            <label
              key={gender}
              className="flex cursor-pointer items-center gap-2 text-sm hover:text-red-600"
            >
              <input
                type="checkbox"
                checked={selectedGenders.includes(gender)}
                onChange={() => toggleGender(gender)}
                className="h-4 w-4 rounded accent-red-500"
              />
              <span>{GENDER_NAMES[gender]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Prodavnica</h3>
        <div className="space-y-1.5">
          {stores.map((store) => (
            <label
              key={store}
              className="flex cursor-pointer items-center gap-2 text-sm hover:text-red-600"
            >
              <input
                type="checkbox"
                checked={selectedStores.includes(store)}
                onChange={() => toggleStore(store)}
                className="h-4 w-4 rounded accent-red-500"
              />
              <span>{STORE_NAMES[store]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Kategorija</h3>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-2">
          {categories.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 text-sm hover:text-red-600"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => toggleCategory(category)}
                className="h-4 w-4 rounded accent-red-500"
              />
              <span>{CATEGORY_NAMES[category]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Min. popust: {minDiscount}%
        </h3>
        <input
          type="range"
          min={50}
          max={90}
          step={5}
          value={minDiscount}
          onChange={(e) => {
            setMinDiscount(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="w-full accent-red-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>50%</span>
          <span>90%</span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Max cena:{" "}
          {maxPrice === null
            ? "Bez limita"
            : `${maxPrice.toLocaleString()} RSD`}
        </h3>
        <input
          type="range"
          min={priceRange.min}
          max={priceRange.max}
          step={1000}
          value={maxPrice ?? priceRange.max}
          onChange={(e) => {
            const val = Number(e.target.value);
            setMaxPrice(val >= priceRange.max ? null : val);
            setCurrentPage(1);
          }}
          className="w-full accent-red-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{priceRange.min.toLocaleString()}</span>
          <span>{priceRange.max.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Brend</h3>
        <Input
          type="search"
          placeholder="Pretraži brendove..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
          {filteredBrands.map((brand) => (
            <label
              key={brand}
              className="flex cursor-pointer items-center gap-2 text-sm hover:text-red-600"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                className="h-4 w-4 rounded accent-red-500"
              />
              <span className="truncate">{brand}</span>
            </label>
          ))}
          {filteredBrands.length === 0 && (
            <p className="text-xs text-gray-400">Nema rezultata</p>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="w-full"
        >
          Resetuj filtere
        </Button>
      )}
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
          <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] overflow-y-auto bg-white shadow-xl rounded-r-2xl animate-[slideInLeft_0.25s_ease-out]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
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
            <div className="p-4 pb-8">
              {filterContentJSX}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="flex gap-6">
        {/* Desktop Sidebar - hidden on mobile/tablet */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div
            className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-white p-4 shadow-sm"
            onWheel={(e) => e.stopPropagation()}
          >
            {filterContentJSX}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
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
              {maxPrice !== null && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    setMaxPrice(null);
                    setCurrentPage(1);
                  }}
                >
                  Max {maxPrice.toLocaleString()} RSD ✕
                </Badge>
              )}
            </div>
          )}

          {/* Deals Grid */}
          {paginatedDeals.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Nema proizvoda koji odgovaraju filterima
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {paginatedDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
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
