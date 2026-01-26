"use client";

import { useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useCookieConsent } from "@/context/cookie-consent-context";

interface ConditionalAnalyticsProps {
  gaId: string;
}

export function ConditionalAnalytics({ gaId }: ConditionalAnalyticsProps) {
  const { consentStatus } = useCookieConsent();

  // Clear GA cookies if consent is rejected
  useEffect(() => {
    if (consentStatus === "rejected") {
      // Delete Google Analytics cookies
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const cookieName = cookie.split("=")[0].trim();
        if (cookieName.startsWith("_ga") || cookieName.startsWith("_gid")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        }
      }
    }
  }, [consentStatus]);

  // Only render GoogleAnalytics if consent is accepted
  if (consentStatus !== "accepted") {
    return null;
  }

  return <GoogleAnalytics gaId={gaId} />;
}
