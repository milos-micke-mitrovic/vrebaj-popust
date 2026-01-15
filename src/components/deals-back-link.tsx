"use client";

import { useState } from "react";
import Link from "next/link";

export function DealsBackLink() {
  // Initialize from sessionStorage (only runs on client)
  const [returnUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("dealsReturnUrl") || "/ponude";
    }
    return "/ponude";
  });

  return (
    <Link href={returnUrl} className="hover:text-red-500">
      Ponude
    </Link>
  );
}
