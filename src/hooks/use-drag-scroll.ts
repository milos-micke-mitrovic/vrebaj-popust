"use client";

import { useRef, useEffect, useCallback } from "react";

interface UseDragScrollOptions {
  speed?: number; // pixels per 16ms frame
  pauseOnHover?: boolean;
}

/**
 * Auto-scrolling carousel hook using GPU-composited transforms.
 *
 * The container ref should be placed on an inner "track" element with
 * `w-max` (width: max-content), wrapped in an `overflow-hidden` parent.
 * Content should be duplicated for seamless infinite looping.
 */
export function useDragScroll({ speed = 0.5, pauseOnHover = true }: UseDragScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragStartOffset = useRef(0);
  const isPaused = useRef(false);
  const animationRef = useRef<number>(undefined);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const touchDirectionRef = useRef<"none" | "horizontal" | "vertical">("none");

  const applyTransform = useCallback(() => {
    const el = containerRef.current;
    if (el) el.style.transform = `translateX(${-offsetRef.current}px)`;
  }, []);

  const getHalfWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return Infinity;
    // Track has w-max so offsetWidth = total content width; content is duplicated
    return el.offsetWidth / 2;
  }, []);

  const wrapOffset = useCallback(() => {
    const hw = getHalfWidth();
    if (hw === Infinity || hw <= 0) return;
    while (offsetRef.current >= hw) offsetRef.current -= hw;
    while (offsetRef.current < 0) offsetRef.current += hw;
  }, [getHalfWidth]);

  // Time-based auto-scroll for consistent speed across frame rates
  const autoScroll = useCallback((timestamp: number) => {
    if (!isPaused.current && !isDragging.current && containerRef.current) {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      // Cap delta to avoid large jumps after tab regains focus
      offsetRef.current += speed * (Math.min(delta, 100) / 16);
      wrapOffset();
      applyTransform();
    }
    lastTimeRef.current = timestamp;
    animationRef.current = requestAnimationFrame(autoScroll);
  }, [speed, applyTransform, wrapOffset]);

  // ── Mouse handlers ──

  const onMouseDown = useCallback((e: MouseEvent) => {
    isDragging.current = true;
    wasDragged.current = false;
    startX.current = e.pageX;
    dragStartOffset.current = offsetRef.current;
    const el = containerRef.current;
    if (el) el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const dx = e.pageX - startX.current;
    if (Math.abs(dx) > 3) wasDragged.current = true;
    offsetRef.current = dragStartOffset.current - dx;
    wrapOffset();
    applyTransform();
  }, [applyTransform, wrapOffset]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  // ── Touch handlers with direction lock ──
  // Detects if the user is scrolling vertically (page scroll) or
  // horizontally (carousel swipe) and only drags on horizontal movement.

  const onTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].pageX;
    startY.current = e.touches[0].pageY;
    dragStartOffset.current = offsetRef.current;
    touchDirectionRef.current = "none";
    wasDragged.current = false;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (touchDirectionRef.current === "vertical") return;

    const dx = e.touches[0].pageX - startX.current;
    const dy = e.touches[0].pageY - startY.current;

    // Lock direction on first significant movement
    if (touchDirectionRef.current === "none") {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        touchDirectionRef.current = "vertical";
        return;
      }
      if (Math.abs(dx) > 5) {
        touchDirectionRef.current = "horizontal";
        isDragging.current = true;
      } else {
        return;
      }
    }

    wasDragged.current = true;
    offsetRef.current = dragStartOffset.current - dx;
    wrapOffset();
    applyTransform();
  }, [applyTransform, wrapOffset]);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    touchDirectionRef.current = "none";
  }, []);

  // ── Hover pause (desktop) ──

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
    el.style.willChange = "transform";

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);

    // Reset timestamp when tab becomes visible to avoid large jumps
    const onVisibility = () => { lastTimeRef.current = 0; };
    document.addEventListener("visibilitychange", onVisibility);

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
      document.removeEventListener("visibilitychange", onVisibility);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [autoScroll, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd, onMouseEnter, onMouseLeave]);

  // Check if a click should be prevented (was actually a drag)
  const shouldPreventClick = useCallback(() => wasDragged.current, []);

  return { containerRef, shouldPreventClick };
}
