"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  // Using inline styles because global-error.tsx runs when root layout fails,
  // which means Tailwind CSS won't be loaded
  return (
    <html lang="sr">
      <body
        style={{
          margin: 0,
          backgroundColor: "#f9fafb",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              height: "80px",
              width: "80px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
            }}
          >
            <svg
              style={{ height: "40px", width: "40px", color: "#ef4444" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "bold",
              color: "#111827",
            }}
          >
            Ups! Nešto nije u redu
          </h1>
          <p
            style={{
              marginTop: "16px",
              color: "#4b5563",
              maxWidth: "400px",
              lineHeight: 1.5,
            }}
          >
            Došlo je do greške. Molimo osvežite stranicu ili se vratite na
            početnu.
          </p>

          <div
            style={{
              marginTop: "32px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <button
              onClick={reset}
              style={{
                cursor: "pointer",
                borderRadius: "8px",
                backgroundColor: "#ef4444",
                padding: "12px 24px",
                fontWeight: 500,
                color: "white",
                border: "none",
                fontSize: "16px",
              }}
            >
              Pokušaj ponovo
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                padding: "12px 24px",
                fontWeight: 500,
                color: "#374151",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Početna stranica
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
