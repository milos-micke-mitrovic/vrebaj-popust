import type { Dispatch, SetStateAction } from "react";
import type { Store, Gender, Category, CategoryPath, MainCategory, Subcategory } from "@/types/deal";
import { Input } from "@/components/ui/input";
import { ScrollFade } from "@/components/scroll-fade";
import { FilterSection } from "./filter-section";
import { Percent, Banknote, Users, ShoppingBag, Grid3X3, Footprints, Shirt, Tag } from "lucide-react";
import {
  STORE_NAMES,
  GENDER_NAMES,
  SUBCATEGORY_NAMES,
  MAIN_CATEGORY_NAMES,
  CATEGORY_HIERARCHY,
  SHOE_SIZES,
  CLOTHING_SIZES,
  DISCOUNT_LEVELS,
  PRICE_FROM_OPTIONS,
  PRICE_TO_OPTIONS,
} from "@/lib/display-constants";

export type FilterSectionId = "discount" | "price" | "gender" | "store" | "category" | "shoeSize" | "clothingSize" | "brand";

export interface DealsFilterSidebarProps {
  // State
  search: string;
  selectedStores: Store[];
  selectedBrands: string[];
  selectedGenders: Gender[];
  selectedCategories: Category[];
  selectedCategoryPaths: CategoryPath[];
  selectedSizes: string[];
  minDiscount: number;
  minPrice: number | null;
  maxPrice: number | null;
  brandSearch: string;
  expandedCategories: MainCategory[];
  filteredBrands: string[];

  // Setters
  setSearch: Dispatch<SetStateAction<string>>;
  setSelectedStores: Dispatch<SetStateAction<Store[]>>;
  setSelectedBrands: Dispatch<SetStateAction<string[]>>;
  setSelectedGenders: Dispatch<SetStateAction<Gender[]>>;
  setSelectedCategories: Dispatch<SetStateAction<Category[]>>;
  setSelectedCategoryPaths: Dispatch<SetStateAction<CategoryPath[]>>;
  setSelectedSizes: Dispatch<SetStateAction<string[]>>;
  setMinDiscount: Dispatch<SetStateAction<number>>;
  setMinPrice: Dispatch<SetStateAction<number | null>>;
  setMaxPrice: Dispatch<SetStateAction<number | null>>;
  setBrandSearch: Dispatch<SetStateAction<string>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setExpandedCategories: Dispatch<SetStateAction<MainCategory[]>>;

  // Collapse state
  collapsedSections: FilterSectionId[];
  toggleSection: (section: FilterSectionId) => void;

  // Callbacks
  onInteraction: () => void;
  scrollToTop: () => void;
}

export function DealsFilterSidebar({
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
  brandSearch,
  expandedCategories,
  filteredBrands,
  setSearch,
  setSelectedStores,
  setSelectedBrands,
  setSelectedGenders,
  setSelectedCategories,
  setSelectedCategoryPaths,
  setSelectedSizes,
  setMinDiscount,
  setMinPrice,
  setMaxPrice,
  setBrandSearch,
  setCurrentPage,
  setExpandedCategories,
  collapsedSections,
  toggleSection,
  onInteraction,
  scrollToTop,
}: DealsFilterSidebarProps) {
  const isCollapsed = (section: FilterSectionId) => collapsedSections.includes(section);

  const interact = () => { onInteraction(); };

  const toggleStore = (store: Store) => {
    interact();
    setSelectedStores((prev) => prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]);
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleGender = (gender: Gender) => {
    interact();
    setSelectedGenders((prev) => prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]);
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleBrand = (brand: string) => {
    interact();
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleSize = (size: string) => {
    interact();
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleCategoryPath = (path: CategoryPath) => {
    interact();
    setSelectedCategoryPaths((prev) => prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]);
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleMainCategory = (mainCat: MainCategory) => {
    interact();
    const subcats = CATEGORY_HIERARCHY[mainCat];
    const paths = subcats.map((sub) => `${mainCat}/${sub}` as CategoryPath);
    const allSelected = paths.every((p) => selectedCategoryPaths.includes(p));
    if (allSelected) {
      setSelectedCategoryPaths((prev) => prev.filter((p) => !paths.includes(p)));
    } else {
      setSelectedCategoryPaths((prev) => [...new Set([...prev, ...paths])]);
    }
    setCurrentPage(1);
    scrollToTop();
  };

  const toggleExpandedCategory = (cat: MainCategory) => {
    setExpandedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const selectedShoeCount = selectedSizes.filter((s) => SHOE_SIZES.includes(s)).length;
  const selectedClothingCount = selectedSizes.filter((s) => CLOTHING_SIZES.includes(s)).length;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <Input
          type="search"
          placeholder="Pretraži proizvode..."
          value={search}
          onChange={(e) => {
            interact();
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-gray-50 border-gray-200 focus:bg-white dark:bg-gray-800 dark:border-gray-700 dark:focus:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Discount */}
      <FilterSection
        icon={<Percent className="w-4 h-4" />}
        title="Popust"
        activeCount={minDiscount > 50 ? 1 : 0}
        onClear={() => { interact(); setMinDiscount(50); setCurrentPage(1); }}
        collapsed={isCollapsed("discount")}
        onToggle={() => toggleSection("discount")}
      >
        <div className="flex flex-wrap gap-2">
          {DISCOUNT_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => { interact(); setMinDiscount(minDiscount === level.value ? 50 : level.value); setCurrentPage(1); scrollToTop(); }}
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
      </FilterSection>

      {/* Price Range */}
      <FilterSection
        icon={<Banknote className="w-4 h-4" />}
        title="Cena (RSD)"
        activeCount={(minPrice !== null ? 1 : 0) + (maxPrice !== null ? 1 : 0)}
        onClear={() => { interact(); setMinPrice(null); setMaxPrice(null); setCurrentPage(1); }}
        collapsed={isCollapsed("price")}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">Od</span>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_FROM_OPTIONS.map((option) => (
                <button
                  key={`from-${option.label}`}
                  onClick={() => { interact(); setMinPrice(option.value); setCurrentPage(1); scrollToTop(); }}
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
              {PRICE_TO_OPTIONS.map((option) => (
                <button
                  key={`to-${option.label}`}
                  onClick={() => { interact(); setMaxPrice(option.value); setCurrentPage(1); scrollToTop(); }}
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
      </FilterSection>

      {/* Gender */}
      <FilterSection
        icon={<Users className="w-4 h-4" />}
        title="Pol"
        activeCount={selectedGenders.length}
        onClear={() => { interact(); setSelectedGenders([]); setCurrentPage(1); }}
        collapsed={isCollapsed("gender")}
        onToggle={() => toggleSection("gender")}
      >
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
      </FilterSection>

      {/* Store */}
      <FilterSection
        icon={<ShoppingBag className="w-4 h-4" />}
        title="Prodavnica"
        activeCount={selectedStores.length}
        onClear={() => { interact(); setSelectedStores([]); setCurrentPage(1); }}
        collapsed={isCollapsed("store")}
        onToggle={() => toggleSection("store")}
      >
        <div className="space-y-1">
          {(Object.keys(STORE_NAMES) as Store[]).map((store) => (
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
      </FilterSection>

      {/* Category - Hierarchical */}
      <FilterSection
        icon={<Grid3X3 className="w-4 h-4" />}
        title="Kategorija"
        activeCount={selectedCategoryPaths.length + (selectedCategories.includes("ostalo") ? 1 : 0)}
        onClear={() => { interact(); setSelectedCategoryPaths([]); setSelectedCategories((prev) => prev.filter((c) => c !== "ostalo")); setCurrentPage(1); }}
        collapsed={isCollapsed("category")}
        onToggle={() => toggleSection("category")}
      >
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
                <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
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
                  </div>
                </div>
              </div>
            );
          })}
          {/* Bez kategorije */}
          <button
            type="button"
            onClick={() => {
              interact();
              setSelectedCategories((prev) =>
                prev.includes("ostalo") ? prev.filter((c) => c !== "ostalo") : [...prev, "ostalo" as Category]
              );
              setCurrentPage(1);
              scrollToTop();
            }}
            className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors cursor-pointer mt-2 border border-gray-200 dark:border-gray-700 ${
              selectedCategories.includes("ostalo")
                ? "bg-red-50 dark:bg-red-900/20"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
              selectedCategories.includes("ostalo")
                ? "bg-red-500 border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}>
              {selectedCategories.includes("ostalo") && (
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Bez kategorije</span>
          </button>
        </div>
      </FilterSection>

      {/* Shoe Size */}
      <FilterSection
        icon={<Footprints className="w-4 h-4" />}
        title="Veličina obuće"
        activeCount={selectedShoeCount}
        onClear={() => { interact(); setSelectedSizes((prev) => prev.filter((s) => !SHOE_SIZES.includes(s))); setCurrentPage(1); }}
        collapsed={isCollapsed("shoeSize")}
        onToggle={() => toggleSection("shoeSize")}
      >
        <ScrollFade maxHeight="120px" fadeColor="gray">
          <div className="flex flex-wrap gap-1.5 pr-1">
            {SHOE_SIZES.map((size) => (
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
      </FilterSection>

      {/* Clothing Size */}
      <FilterSection
        icon={<Shirt className="w-4 h-4" />}
        title="Veličina odeće"
        activeCount={selectedClothingCount}
        onClear={() => { interact(); setSelectedSizes((prev) => prev.filter((s) => !CLOTHING_SIZES.includes(s))); setCurrentPage(1); }}
        collapsed={isCollapsed("clothingSize")}
        onToggle={() => toggleSection("clothingSize")}
      >
        <div className="flex flex-wrap gap-1.5">
          {CLOTHING_SIZES.map((size) => (
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
      </FilterSection>

      {/* Brand */}
      <FilterSection
        icon={<Tag className="w-4 h-4" />}
        title="Brend"
        activeCount={selectedBrands.length}
        onClear={() => { interact(); setSelectedBrands([]); setBrandSearch(""); setCurrentPage(1); }}
        collapsed={isCollapsed("brand")}
        onToggle={() => toggleSection("brand")}
      >
        <Input
          type="search"
          placeholder="Pretraži brendove..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="mb-3 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white dark:bg-gray-800 dark:border-gray-700 dark:focus:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <ScrollFade maxHeight="200px" fadeColor="gray">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema rezultata</p>
            )}
          </div>
        </ScrollFade>
      </FilterSection>
    </div>
  );
}
