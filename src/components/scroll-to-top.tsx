"use client";

import { useLayoutEffect } from "react";

// Disable browser scroll restoration globally - add to root layout
export function DisableScrollRestoration() {
  useLayoutEffect(() => {
    if (history.scrollRestoration) {
      history.scrollRestoration = "manual";
    }
  }, []);

  return null;
}

// Scroll to top on mount - add to pages that need it
export function ScrollToTop() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}
