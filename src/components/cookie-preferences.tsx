"use client";

import { useCookieConsent } from "@/context/cookie-consent-context";

export function CookiePreferences() {
  const { consentStatus, acceptCookies, rejectCookies } = useCookieConsent();

  const statusText = {
    pending: "Niste još izabrali",
    accepted: "Prihvaćeni",
    rejected: "Odbijeni",
  };

  const statusColor = {
    pending: "text-yellow-600 dark:text-yellow-500",
    accepted: "text-green-600 dark:text-green-500",
    rejected: "text-red-600 dark:text-red-500",
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Trenutni status kolačića za analitiku:{" "}
            <span className={`font-semibold ${statusColor[consentStatus]}`}>
              {statusText[consentStatus]}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {consentStatus === "accepted" ? (
            <button
              onClick={rejectCookies}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
            >
              Odbij kolačiće
            </button>
          ) : consentStatus === "rejected" ? (
            <button
              onClick={acceptCookies}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
            >
              Prihvati kolačiće
            </button>
          ) : (
            <>
              <button
                onClick={rejectCookies}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Odbij
              </button>
              <button
                onClick={acceptCookies}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              >
                Prihvati
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
