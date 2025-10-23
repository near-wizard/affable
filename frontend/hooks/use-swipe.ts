"use client";

import { useEffect, useRef, useCallback } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down";

interface SwipeOptions {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  onSwipe: (direction: SwipeDirection) => void;
}

interface TouchStartEvent {
  clientX: number;
  clientY: number;
}

/**
 * Hook to detect swipe gestures on touch devices
 * Useful for mobile navigation patterns like "swipe to close" or "swipe to go back"
 */
export function useSwipe(
  elementRef: React.RefObject<HTMLElement>,
  { threshold = 50, onSwipe }: SwipeOptions
) {
  const startPos = useRef<TouchStartEvent | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!startPos.current) return;

      const endTouch = e.changedTouches[0];
      const endPos = {
        clientX: endTouch.clientX,
        clientY: endTouch.clientY,
      };

      const diffX = startPos.current.clientX - endPos.clientX;
      const diffY = startPos.current.clientY - endPos.clientY;

      // Determine if swipe is primarily horizontal or vertical
      const isHorizontal = Math.abs(diffX) > Math.abs(diffY);

      if (isHorizontal) {
        if (Math.abs(diffX) > threshold) {
          const direction: SwipeDirection = diffX > 0 ? "left" : "right";
          onSwipe(direction);
        }
      } else {
        if (Math.abs(diffY) > threshold) {
          const direction: SwipeDirection = diffY > 0 ? "up" : "down";
          onSwipe(direction);
        }
      }

      startPos.current = null;
    },
    [threshold, onSwipe]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, elementRef]);
}
