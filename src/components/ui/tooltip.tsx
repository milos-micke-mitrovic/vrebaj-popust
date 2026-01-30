"use client";

import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mount = () => setMounted(true);
    mount();
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    let top = triggerRect.top - padding;
    let left = triggerRect.left + triggerRect.width / 2;

    // Prevent overflow on left edge
    if (left - tooltipRect.width / 2 < padding) {
      left = tooltipRect.width / 2 + padding;
    }

    // Prevent overflow on right edge
    if (left + tooltipRect.width / 2 > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width / 2 - padding;
    }

    // Prevent overflow on top edge - show below instead
    if (top - tooltipRect.height < padding) {
      top = triggerRect.bottom + padding + tooltipRect.height;
    }

    setPosition({ top, left });
  }, []);

  const showTooltip = () => {
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && mounted) {
      // Small delay to let the tooltip render first
      requestAnimationFrame(updatePosition);

      // Hide tooltip on scroll (capture: true to catch scroll on any container)
      window.addEventListener("scroll", hideTooltip, true);
      return () => window.removeEventListener("scroll", hideTooltip, true);
    }
  }, [isVisible, mounted, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ top: position.top, left: position.left }}
          role="tooltip"
        >
          <div className="relative bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-t-gray-900 dark:border-t-gray-100 border-x-transparent border-b-transparent" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
