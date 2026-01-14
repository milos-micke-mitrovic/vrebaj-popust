"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-10 w-10 text-red-500"
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

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ups! Nešto nije u redu
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Došlo je do greške prilikom učitavanja stranice.
          Molimo pokušajte ponovo.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="cursor-pointer rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 transition-colors"
          >
            Pokušaj ponovo
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Početna stranica
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
