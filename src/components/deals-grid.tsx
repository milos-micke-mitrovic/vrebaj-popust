"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Store, Gender, Category, CategoryPath, MainCategory, Subcategory } from "@/types/deal";
import { DealCard, DealCardSkeleton } from "./deal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { useDealsApi } from "@/hooks/use-deals-api";
import { DealsFilterSidebar, type FilterSectionId } from "./filters/deals-filter-sidebar";
import {
  ITEMS_PER_PAGE,
  STORE_NAMES,
  GENDER_NAMES,
  CATEGORY_NAMES,
  SUBCATEGORY_NAMES,
} from "@/lib/display-constants";

interface DealsGridProps {
  initialSearch?: string;
  initialStores?: Store[];
  initialBrands?: string[];
  initialGenders?: Gender[];
  initialCategories?: Category[];
  initialCategoryPaths?: CategoryPath[];
  seoTitle?: string;
  seoSubtitle?: string;
  filterPageSlug?: string;
}

type SortOption = "discount" | "price-low" | "price-high" | "newest";

export function DealsGrid({
  initialSearch = "",
  initialStores = [],
  initialBrands = [],
  initialGenders = [],
  initialCategories = [],
  initialCategoryPaths = [],
  seoTitle,
  seoSubtitle,
  filterPageSlug,
}: DealsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── State ──
  const [search, setSearch] = useState(searchParams.get("q") || initialSearch);
  const [selectedStores, setSelectedStores] = useState<Store[]>(
    (searchParams.get("stores")?.split(",").filter(Boolean) as Store[]) || initialStores
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("brands")?.split(",").filter(Boolean) || initialBrands
  );
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(
    (searchParams.get("genders")?.split(",").filter(Boolean) as Gender[]) || initialGenders
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    (searchParams.get("categories")?.split(",").filter(Boolean) as Category[]) || initialCategories
  );
  const [selectedCategoryPaths, setSelectedCategoryPaths] = useState<CategoryPath[]>(
    (searchParams.get("catPaths")?.split(",").filter(Boolean) as CategoryPath[]) || initialCategoryPaths
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

  // Collapsible filter sections - persist to localStorage
  const [collapsedSections, setCollapsedSections] = useState<FilterSectionId[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("collapsedFilterSections");
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });

  const toggleSection = (section: FilterSectionId) => {
    setCollapsedSections((prev) => {
      const newState = prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section];
      localStorage.setItem("collapsedFilterSections", JSON.stringify(newState));
      return newState;
    });
  };

  // ── Data fetching ──
  const {
    deals, total, totalPages, isLoading, isInitialLoad, error,
    availableBrands: apiBrands,
  } = useDealsApi({
    search, stores: selectedStores, brands: selectedBrands,
    genders: selectedGenders, categories: selectedCategories,
    categoryPaths: selectedCategoryPaths, sizes: selectedSizes,
    minDiscount, minPrice, maxPrice, sortBy, page: currentPage,
  });

  // ── Side effects ──
  useEffect(() => {
    if (showMobileFilters) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [showMobileFilters]);

  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || isLoading || isInitialLoad) return;
    const savedScrollPosition = sessionStorage.getItem("dealsScrollPosition");
    const clickedProductId = sessionStorage.getItem("dealsClickedProductId");
    sessionStorage.removeItem("dealsScrollPosition");
    sessionStorage.removeItem("dealsClickedProductId");
    if (savedScrollPosition || clickedProductId) {
      scrollRestored.current = true;
      const timer = setTimeout(() => {
        if (clickedProductId) {
          const productCard = document.querySelector(`[href="/ponuda/${clickedProductId}"]`);
          if (productCard) {
            productCard.scrollIntoView({ behavior: "instant", block: "center" });
            const cardElement = productCard.querySelector('.group');
            if (cardElement) {
              cardElement.classList.add('highlight-glow');
              setTimeout(() => cardElement.classList.remove('highlight-glow'), 2000);
            }
          } else {
            window.scrollTo({ top: parseInt(savedScrollPosition || "0", 10), behavior: "instant" });
          }
        } else {
          window.scrollTo({ top: parseInt(savedScrollPosition || "0", 10), behavior: "instant" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isInitialLoad, deals.length]);

  useEffect(() => {
    localStorage.setItem("sortPreference", sortBy);
  }, [sortBy]);

  // ── URL sync ──
  const isUpdatingFromUrl = useRef(false);
  const urlUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstSyncMount = useRef(true);
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    if (isFirstSyncMount.current) { isFirstSyncMount.current = false; return; }
    if (filterPageSlug) return;
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
    if (currentParams.toString() !== searchParams.toString()) {
      isUpdatingFromUrl.current = true;
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
      setTimeout(() => { isUpdatingFromUrl.current = false; }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filterPageSlug]);

  useEffect(() => {
    if (isUpdatingFromUrl.current) return;
    if (filterPageSlug && !hasUserInteracted.current) return;
    if (urlUpdateTimeout.current) clearTimeout(urlUpdateTimeout.current);
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
      const basePath = filterPageSlug ? "/ponude" : pathname;
      const newUrl = params.toString() ? `${basePath}?${params}` : basePath;
      router.replace(newUrl, { scroll: false });
    }, 300);
    return () => { if (urlUpdateTimeout.current) clearTimeout(urlUpdateTimeout.current); };
  }, [search, selectedStores, selectedBrands, selectedGenders, selectedCategories, selectedCategoryPaths, selectedSizes, minDiscount, minPrice, maxPrice, sortBy, currentPage, pathname, router, filterPageSlug]);

  // ── Derived values ──
  const filteredBrands = useMemo(() => {
    const sorted = [...apiBrands].sort((a, b) => a.localeCompare(b, "sr"));
    if (!brandSearch) return sorted;
    return sorted.filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [apiBrands, brandSearch]);

  // ── Handlers ──
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const onInteraction = () => { hasUserInteracted.current = true; };

  const resetFilters = () => {
    onInteraction();
    setSelectedStores([]); setSelectedBrands([]); setSelectedGenders([]);
    setSelectedCategories([]); setSelectedCategoryPaths([]); setSelectedSizes([]);
    setMinDiscount(50); setMinPrice(null); setMaxPrice(null);
    setSearch(""); setBrandSearch(""); setCurrentPage(1);
    scrollToTop();
  };

  // Toggle handlers for active filter badges
  const toggleStore = (store: Store) => {
    onInteraction();
    setSelectedStores((prev) => prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]);
    setCurrentPage(1); scrollToTop();
  };
  const toggleGender = (gender: Gender) => {
    onInteraction();
    setSelectedGenders((prev) => prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]);
    setCurrentPage(1); scrollToTop();
  };
  const toggleCategory = (category: Category) => {
    onInteraction();
    setSelectedCategories((prev) => prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]);
    setCurrentPage(1); scrollToTop();
  };
  const toggleBrand = (brand: string) => {
    onInteraction();
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
    setCurrentPage(1); scrollToTop();
  };
  const toggleSize = (size: string) => {
    onInteraction();
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
    setCurrentPage(1); scrollToTop();
  };
  const toggleCategoryPath = (path: CategoryPath) => {
    onInteraction();
    setSelectedCategoryPaths((prev) => prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]);
    setCurrentPage(1); scrollToTop();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    search.length > 0 || selectedStores.length > 0 || selectedGenders.length > 0 ||
    selectedCategories.length > 0 || selectedCategoryPaths.length > 0 ||
    selectedBrands.length > 0 || selectedSizes.length > 0 ||
    minDiscount > 50 || minPrice !== null || maxPrice !== null;

  const activeFilterCount =
    (search.length > 0 ? 1 : 0) + selectedStores.length + selectedGenders.length +
    selectedCategories.length + selectedCategoryPaths.length + selectedBrands.length +
    selectedSizes.length + (minDiscount > 50 ? 1 : 0) +
    (minPrice !== null ? 1 : 0) + (maxPrice !== null ? 1 : 0);

  // ── Shared sidebar props ──
  const filterSidebarProps = {
    search, selectedStores, selectedBrands, selectedGenders,
    selectedCategories, selectedCategoryPaths, selectedSizes, minDiscount, minPrice, maxPrice,
    brandSearch, expandedCategories, filteredBrands,
    setSearch, setSelectedStores, setSelectedBrands, setSelectedGenders,
    setSelectedCategories, setSelectedCategoryPaths, setSelectedSizes, setMinDiscount, setMinPrice,
    setMaxPrice, setBrandSearch, setCurrentPage, setExpandedCategories,
    collapsedSections, toggleSection, onInteraction, scrollToTop,
  };

  // ── Render ──
  return (
    <div>
      {/* Fixed Filter Tab Button (mobile/tablet only) */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="cursor-pointer fixed left-0 top-24 z-40 flex items-center gap-1.5 rounded-r-lg bg-red-500 px-3 py-2.5 text-white shadow-lg transition-all hover:bg-red-600 hover:pl-4 lg:hidden"
        aria-label="Otvori filtere"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm font-medium">Filteri</span>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-red-500">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-[fadeIn_0.2s_ease-out]" onClick={() => setShowMobileFilters(false)} />
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
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-4">
              <DealsFilterSidebar {...filterSidebarProps} />
            </div>
            {hasActiveFilters && (
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Button variant="outline" size="sm" onClick={resetFilters} className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
                  Resetuj filtere ✕
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[7rem] rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col max-h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              <DealsFilterSidebar {...filterSidebarProps} />
            </div>
            {hasActiveFilters && (
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={resetFilters} className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
                  Resetuj filtere ✕
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Top Bar: Sort and count */}
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <p className="order-2 w-full text-right text-sm text-gray-600 dark:text-gray-400 sm:order-none sm:w-auto sm:text-left">
              {isLoading || isInitialLoad ? "..." : `${total} ${total === 1 ? "proizvod" : "proizvoda"}`}
            </p>
            <select
              value={sortBy}
              onChange={(e) => { onInteraction(); setSortBy(e.target.value as SortOption); setCurrentPage(1); scrollToTop(); }}
              className="appearance-none rounded border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
            >
              <option value="discount">Sortiraj: Popust ↓</option>
              <option value="price-low">Sortiraj: Cena ↑</option>
              <option value="price-high">Sortiraj: Cena ↓</option>
              <option value="newest">Sortiraj: Najnovije</option>
            </select>
          </div>

          {/* Active Filters Row with SEO Title */}
          {(hasActiveFilters || (seoTitle && searchParams.toString() === "")) && (
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2 flex-1">
                {search && (
                  <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => { onInteraction(); setSearch(""); setCurrentPage(1); }}>
                    Pretraga: &quot;{search}&quot; ✕
                  </Badge>
                )}
                {selectedStores.map((store) => (
                  <Badge key={store} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleStore(store)}>
                    {STORE_NAMES[store]} ✕
                  </Badge>
                ))}
                {selectedGenders.map((gender) => (
                  <Badge key={gender} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleGender(gender)}>
                    {GENDER_NAMES[gender]} ✕
                  </Badge>
                ))}
                {selectedCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleCategory(category)}>
                    {CATEGORY_NAMES[category]} ✕
                  </Badge>
                ))}
                {selectedCategoryPaths.map((path) => {
                  const [, sub] = path.split("/") as [MainCategory, Subcategory];
                  return (
                    <Badge key={path} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleCategoryPath(path)}>
                      {SUBCATEGORY_NAMES[sub]} ✕
                    </Badge>
                  );
                })}
                {selectedBrands.map((brand) => (
                  <Badge key={brand} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleBrand(brand)}>
                    {brand} ✕
                  </Badge>
                ))}
                {selectedSizes.map((size) => (
                  <Badge key={size} variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleSize(size)}>
                    Vel. {size} ✕
                  </Badge>
                ))}
                {minDiscount > 50 && (
                  <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => { onInteraction(); setMinDiscount(50); setCurrentPage(1); }}>
                    Min {minDiscount}% ✕
                  </Badge>
                )}
                {minPrice !== null && (
                  <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => { onInteraction(); setMinPrice(null); setCurrentPage(1); }}>
                    Od {minPrice.toLocaleString()} RSD ✕
                  </Badge>
                )}
                {maxPrice !== null && (
                  <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => { onInteraction(); setMaxPrice(null); setCurrentPage(1); }}>
                    Do {maxPrice.toLocaleString()} RSD ✕
                  </Badge>
                )}
              </div>
              {seoTitle && searchParams.toString() === "" && (
                <div className="flex-shrink-0 text-right">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">{seoTitle}</h1>
                  {seoSubtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{seoSubtitle}</p>}
                </div>
              )}
            </div>
          )}

          {/* Deals Grid */}
          {isLoading || isInitialLoad ? (
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]"><DealCardSkeleton /></div>
              ))}
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <SearchX className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Greška</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">{error}</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <SearchX className="w-10 h-10 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nema rezultata</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Nismo pronašli proizvode koji odgovaraju tvojim filterima. Probaj da prilagodiš pretragu.</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
                  Resetuj filtere
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {deals.map((deal) => (
                <div key={deal.id} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]"><DealCard deal={deal} /></div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(1)} className="hidden sm:inline-flex">
                  ««
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                  ‹ Nazad
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => handlePageChange(pageNum)} className="w-9 h-9">
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                  Dalje ›
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(totalPages)} className="hidden sm:inline-flex">
                  »»
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Prikazano {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, total)} od {total} proizvoda
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
