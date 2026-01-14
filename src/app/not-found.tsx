import Link from "next/link";
import { Header } from "@/components/header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-6xl font-bold text-red-500">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          Stranica nije pronađena
        </h2>
        <p className="mt-2 text-gray-600">
          Stranica koju tražite ne postoji ili je uklonjena.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/"
            className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 transition-colors"
          >
            Početna
          </Link>
          <Link
            href="/ponude"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Sve ponude
          </Link>
        </div>
      </main>
    </div>
  );
}
