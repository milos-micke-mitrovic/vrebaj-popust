"use client";

import { useLayoutEffect, useEffect } from "react";

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
// Uses multiple attempts to ensure scroll happens
export function ScrollToTop() {
  // Immediate scroll before paint
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Also scroll after paint in case browser overrides
  useEffect(() => {
    window.scrollTo(0, 0);
    // And again after a tiny delay to catch any async scroll restoration
    const timer = setTimeout(() => window.scrollTo(0, 0), 0);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
