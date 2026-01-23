"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { RecentlyViewedProvider } from "@/context/recently-viewed-context";
import { WishlistDrawer } from "@/components/wishlist-drawer";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";

interface AppProvidersProps {
  children: ReactNode;
  availableDealIds: string[];
}

export function AppProviders({ children, availableDealIds }: AppProvidersProps) {
  const availableSet = new Set(availableDealIds);

  return (
    <ThemeProvider>
      <WishlistProvider>
        <RecentlyViewedProvider>
          {children}
          <WishlistDrawer availableDealIds={availableSet} />
          <ScrollToTopButton />
        </RecentlyViewedProvider>
      </WishlistProvider>
    </ThemeProvider>
  );
}
