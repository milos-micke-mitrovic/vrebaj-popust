"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface ScrollFadeProps {
  children: ReactNode;
  maxHeight: string;
  className?: string;
}

export function ScrollFade({ children, maxHeight, className = "" }: ScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTopFade(scrollTop > 5);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      // Check on resize too
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(el);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Top fade */}
      <div
        className={`pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent z-10 transition-opacity duration-200 ${
          showTopFade ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={`overflow-y-auto scrollbar-thin ${className}`}
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Bottom fade */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent z-10 transition-opacity duration-200 ${
          showBottomFade ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
