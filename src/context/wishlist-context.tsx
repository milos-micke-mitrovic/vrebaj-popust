"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Deal } from "@/types/deal";

const WISHLIST_KEY = "vrebajpopust_wishlist";

interface WishlistContextType {
  wishlist: Deal[];
  isLoaded: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToWishlist: (deal: Deal) => void;
  removeFromWishlist: (dealId: string) => void;
  toggleWishlist: (deal: Deal) => void;
  isInWishlist: (dealId: string) => boolean;
  clearWishlist: () => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<Deal[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const stored = localStorage.getItem(WISHLIST_KEY);
        if (stored) {
          setWishlist(JSON.parse(stored));
        }
      } catch {
        localStorage.removeItem(WISHLIST_KEY);
      }
      setIsLoaded(true);
    };
    loadWishlist();
  }, []);

  // Save to localStorage when wishlist changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist, isLoaded]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addToWishlist = useCallback((deal: Deal) => {
    setWishlist((prev) => {
      if (prev.some((d) => d.id === deal.id)) {
        return prev;
      }
      return [...prev, deal];
    });
  }, []);

  const removeFromWishlist = useCallback((dealId: string) => {
    setWishlist((prev) => prev.filter((d) => d.id !== dealId));
  }, []);

  const toggleWishlist = useCallback((deal: Deal) => {
    setWishlist((prev) => {
      if (prev.some((d) => d.id === deal.id)) {
        return prev.filter((d) => d.id !== deal.id);
      }
      return [...prev, deal];
    });
  }, []);

  const isInWishlist = useCallback(
    (dealId: string) => wishlist.some((d) => d.id === dealId),
    [wishlist]
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isLoaded,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistContext() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlistContext must be used within WishlistProvider");
  }
  return context;
}
