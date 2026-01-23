"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { RecentlyViewedProvider } from "@/context/recently-viewed-context";
import { QuickViewProvider, useQuickView } from "@/context/quick-view-context";
import { WishlistDrawer } from "@/components/wishlist-drawer";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { QuickViewModal } from "@/components/quick-view-modal";

interface AppProvidersProps {
  children: ReactNode;
  availableDealIds: string[];
}

function QuickViewModalWrapper() {
  const { deal, closeQuickView } = useQuickView();
  return <QuickViewModal deal={deal} onClose={closeQuickView} />;
}

export function AppProviders({ children, availableDealIds }: AppProvidersProps) {
  const availableSet = new Set(availableDealIds);

  return (
    <ThemeProvider>
      <WishlistProvider>
        <RecentlyViewedProvider>
          <QuickViewProvider>
            {children}
            <WishlistDrawer availableDealIds={availableSet} />
            <ScrollToTopButton />
            <QuickViewModalWrapper />
          </QuickViewProvider>
        </RecentlyViewedProvider>
      </WishlistProvider>
    </ThemeProvider>
  );
}
