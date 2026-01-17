"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Deal, Store, Gender, Category, CategoryPath } from "@/types/deal";

interface UseDealsApiParams {
  search: string;
  stores: Store[];
  brands: string[];
  genders: Gender[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  sizes: string[];
  minDiscount: number;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string;
  page: number;
  limit?: number;
}

interface DealsApiResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    brands: { name: string; count: number }[];
    stores: { name: string; count: number }[];
    genders: { name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

interface UseDealsApiResult {
  deals: Deal[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  isInitialLoad: boolean;
  error: string | null;
  availableBrands: string[];
  availableStores: Store[];
  availableGenders: Gender[];
  priceRange: { min: number; max: number };
  refetch: () => void;
}

export function useDealsApi(params: UseDealsApiParams): UseDealsApiResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [availableGenders, setAvailableGenders] = useState<Gender[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDeals = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(params.page));
      if (params.limit) queryParams.set("limit", String(params.limit));
      if (params.search) queryParams.set("search", params.search);
      if (params.stores.length) queryParams.set("stores", params.stores.join(","));
      if (params.brands.length) queryParams.set("brands", params.brands.join(","));
      if (params.genders.length) queryParams.set("genders", params.genders.join(","));
      if (params.categories.length) queryParams.set("categories", params.categories.join(","));
      if (params.categoryPaths.length) queryParams.set("categoryPaths", params.categoryPaths.join(","));
      if (params.sizes.length) queryParams.set("sizes", params.sizes.join(","));
      if (params.minDiscount > 50) queryParams.set("minDiscount", String(params.minDiscount));
      if (params.minPrice !== null) queryParams.set("minPrice", String(params.minPrice));
      if (params.maxPrice !== null) queryParams.set("maxPrice", String(params.maxPrice));
      if (params.sortBy) queryParams.set("sortBy", params.sortBy);

      const response = await fetch(`/api/deals?${queryParams}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch deals");
      }

      const data: DealsApiResponse = await response.json();

      setDeals(data.deals);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setAvailableBrands(data.filters.brands.map(b => b.name));
      setAvailableStores(data.filters.stores.map(s => s.name as Store));
      setAvailableGenders(data.filters.genders.map(g => g.name as Gender));
      setPriceRange(data.filters.priceRange);
      setIsInitialLoad(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Ignore abort errors
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.search,
    params.stores,
    params.brands,
    params.genders,
    params.categories,
    params.categoryPaths,
    params.sizes,
    params.minDiscount,
    params.minPrice,
    params.maxPrice,
    params.sortBy,
  ]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchDeals();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDeals]);

  return {
    deals,
    total,
    totalPages,
    isLoading,
    isInitialLoad,
    error,
    availableBrands,
    availableStores,
    availableGenders,
    priceRange,
    refetch: fetchDeals,
  };
}
