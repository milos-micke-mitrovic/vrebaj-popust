"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { RecentlyViewedProvider } from "@/context/recently-viewed-context";
import { QuickViewProvider, useQuickView } from "@/context/quick-view-context";
import { CookieConsentProvider } from "@/context/cookie-consent-context";
import { WishlistDrawer } from "@/components/wishlist-drawer";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { QuickViewModal } from "@/components/quick-view-modal";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ConditionalAnalytics } from "@/components/conditional-analytics";

interface AppProvidersProps {
  children: ReactNode;
  availableDealIds: string[];
  gaId?: string;
}

function QuickViewModalWrapper() {
  const { deal, closeQuickView } = useQuickView();
  return <QuickViewModal deal={deal} onClose={closeQuickView} />;
}

export function AppProviders({ children, availableDealIds, gaId }: AppProvidersProps) {
  const availableSet = new Set(availableDealIds);

  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <WishlistProvider>
          <RecentlyViewedProvider>
            <QuickViewProvider>
              {children}
              <WishlistDrawer availableDealIds={availableSet} />
              <ScrollToTopButton />
              <QuickViewModalWrapper />
              <CookieConsentBanner />
              {gaId && <ConditionalAnalytics gaId={gaId} />}
            </QuickViewProvider>
          </RecentlyViewedProvider>
        </WishlistProvider>
      </CookieConsentProvider>
    </ThemeProvider>
  );
}
