"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src="/logos/logo.png" alt="VrebajPopust" className="h-12 w-12" />
            <span className="text-2xl font-bold text-gray-900">
              Vrebaj<span className="text-red-500">Popust</span>
            </span>
          </Link>
          <nav>
            <Link
              href="/ponude"
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
            >
              Sve ponude
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
