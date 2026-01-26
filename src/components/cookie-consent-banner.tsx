"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useCookieConsent } from "@/context/cookie-consent-context";

export function CookieConsentBanner() {
  const { consentStatus, acceptCookies, rejectCookies } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Show banner after a short delay for better UX
  useEffect(() => {
    if (consentStatus === "pending") {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [consentStatus]);

  const handleAccept = () => {
    setIsClosing(true);
    setTimeout(() => {
      acceptCookies();
      setIsVisible(false);
    }, 300);
  };

  const handleReject = () => {
    setIsClosing(true);
    setTimeout(() => {
      rejectCookies();
      setIsVisible(false);
    }, 300);
  };

  if (consentStatus !== "pending" || !isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${
        isClosing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon and text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Cookie className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  Koristimo kolačiće
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Koristimo kolačiće za analitiku kako bismo razumeli kako koristite sajt i poboljšali vaše iskustvo.{" "}
                  <Link
                    href="/privatnost"
                    className="text-red-500 hover:text-red-600 underline"
                  >
                    Saznaj više
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleReject}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Odbij
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              >
                Prihvati
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
