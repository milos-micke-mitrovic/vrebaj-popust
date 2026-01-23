"use client";

import { useEffect } from "react";
import { useRecentlyViewedContext } from "@/context/recently-viewed-context";
import { Deal } from "@/types/deal";

interface TrackProductViewProps {
  deal: Deal;
}

export function TrackProductView({ deal }: TrackProductViewProps) {
  const { addToRecentlyViewed } = useRecentlyViewedContext();

  useEffect(() => {
    addToRecentlyViewed(deal);
  }, [deal, addToRecentlyViewed]);

  return null;
}
