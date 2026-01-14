"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // Use browser history to go back (preserves filters)
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="text-sm text-red-500 hover:underline flex items-center gap-1"
    >
      ← Nazad
    </button>
  );
}
