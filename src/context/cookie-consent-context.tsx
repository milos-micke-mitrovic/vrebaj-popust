"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ConsentStatus = "pending" | "accepted" | "rejected";

interface CookieConsentContextType {
  consentStatus: ConsentStatus;
  acceptCookies: () => void;
  rejectCookies: () => void;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const CONSENT_KEY = "cookie_consent";

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load consent status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentStatus | null;
    if (stored === "accepted" || stored === "rejected") {
      setConsentStatus(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save consent status to localStorage when it changes
  useEffect(() => {
    if (isLoaded && consentStatus !== "pending") {
      localStorage.setItem(CONSENT_KEY, consentStatus);
    }
  }, [consentStatus, isLoaded]);

  const acceptCookies = () => {
    setConsentStatus("accepted");
  };

  const rejectCookies = () => {
    setConsentStatus("rejected");
  };

  const resetConsent = () => {
    localStorage.removeItem(CONSENT_KEY);
    setConsentStatus("pending");
  };

  return (
    <CookieConsentContext.Provider
      value={{ consentStatus, acceptCookies, rejectCookies, resetConsent }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}
