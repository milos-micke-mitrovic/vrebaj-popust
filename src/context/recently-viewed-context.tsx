"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Deal } from "@/types/deal";

const STORAGE_KEY = "vrebajpopust_recently_viewed";
const MAX_ITEMS = 15;

interface RecentlyViewedContextType {
  recentlyViewed: Deal[];
  isLoaded: boolean;
  addToRecentlyViewed: (deal: Deal) => void;
  clearRecentlyViewed: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | null>(null);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Deal[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadRecentlyViewed = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setRecentlyViewed(JSON.parse(stored));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsLoaded(true);
    };
    loadRecentlyViewed();
  }, []);

  // Save to localStorage when list changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, isLoaded]);

  const addToRecentlyViewed = useCallback((deal: Deal) => {
    setRecentlyViewed((prev) => {
      // Remove if already exists (will be added to front)
      const filtered = prev.filter((d) => d.id !== deal.id);
      // Add to front, limit to MAX_ITEMS
      return [deal, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
  }, []);

  return (
    <RecentlyViewedContext.Provider
      value={{
        recentlyViewed,
        isLoaded,
        addToRecentlyViewed,
        clearRecentlyViewed,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewedContext() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewedContext must be used within RecentlyViewedProvider");
  }
  return context;
}
