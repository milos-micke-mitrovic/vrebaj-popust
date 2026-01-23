"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Deal } from "@/types/deal";

interface QuickViewContextType {
  deal: Deal | null;
  openQuickView: (deal: Deal) => void;
  closeQuickView: () => void;
}

const QuickViewContext = createContext<QuickViewContextType | undefined>(undefined);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [deal, setDeal] = useState<Deal | null>(null);

  const openQuickView = (deal: Deal) => setDeal(deal);
  const closeQuickView = () => setDeal(null);

  return (
    <QuickViewContext.Provider value={{ deal, openQuickView, closeQuickView }}>
      {children}
    </QuickViewContext.Provider>
  );
}

export function useQuickView() {
  const context = useContext(QuickViewContext);
  if (!context) {
    throw new Error("useQuickView must be used within a QuickViewProvider");
  }
  return context;
}
