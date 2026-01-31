"use client";

import { useRef, useEffect, useCallback } from "react";

interface UseDragScrollOptions {
  speed?: number; // pixels per frame for auto-scroll
  pauseOnHover?: boolean;
}

export function useDragScroll({ speed = 0.5, pauseOnHover = true }: UseDragScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const isPaused = useRef(false);
  const animationRef = useRef<number>(undefined);

  // Auto-scroll loop
  const autoScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isPaused.current || isDragging.current) {
      animationRef.current = requestAnimationFrame(autoScroll);
      return;
    }

    el.scrollLeft += speed;

    // Reset to beginning for infinite loop (content is duplicated)
    const halfScroll = el.scrollWidth / 2;
    if (el.scrollLeft >= halfScroll) {
      el.scrollLeft -= halfScroll;
    }

    animationRef.current = requestAnimationFrame(autoScroll);
  }, [speed]);

  // Mouse handlers
  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    wasDragged.current = false;
    startX.current = e.pageX;
    scrollStart.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    const dx = e.pageX - startX.current;
    if (Math.abs(dx) > 3) wasDragged.current = true;
    el.scrollLeft = scrollStart.current - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  // Touch handlers
  const onTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    wasDragged.current = false;
    startX.current = e.touches[0].pageX;
    scrollStart.current = el.scrollLeft;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = e.touches[0].pageX - startX.current;
    if (Math.abs(dx) > 3) wasDragged.current = true;
    el.scrollLeft = scrollStart.current - dx;
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Hover pause
  const onMouseEnter = useCallback(() => {
    if (pauseOnHover) isPaused.current = true;
  }, [pauseOnHover]);

  const onMouseLeave = useCallback(() => {
    isPaused.current = false;
    isDragging.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.style.cursor = "grab";

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);

    // Start auto-scroll
    animationRef.current = requestAnimationFrame(autoScroll);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mouseenter", onMouseEnter);
      el.removeEventListener("mouseleave", onMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [autoScroll, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd, onMouseEnter, onMouseLeave]);

  // Check if a click should be prevented (was a drag)
  const shouldPreventClick = useCallback(() => wasDragged.current, []);

  return { containerRef, shouldPreventClick };
}
