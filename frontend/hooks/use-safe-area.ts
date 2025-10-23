"use client";

import { useEffect, useState } from "react";

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Hook to get safe area insets for iOS devices with notches and home indicators
 * Returns pixel values for each safe area inset
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    // Function to update safe area values from CSS variables
    const updateSafeArea = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      const top = computedStyle.getPropertyValue("--safe-area-inset-top").trim();
      const right = computedStyle.getPropertyValue("--safe-area-inset-right").trim();
      const bottom = computedStyle.getPropertyValue("--safe-area-inset-bottom").trim();
      const left = computedStyle.getPropertyValue("--safe-area-inset-left").trim();

      setInsets({
        top: parseInt(top) || 0,
        right: parseInt(right) || 0,
        bottom: parseInt(bottom) || 0,
        left: parseInt(left) || 0,
      });
    };

    // Initial update
    updateSafeArea();

    // Update on orientation change (common on mobile)
    window.addEventListener("orientationchange", updateSafeArea);
    // Also listen for resize in case viewport changes
    window.addEventListener("resize", updateSafeArea);

    return () => {
      window.removeEventListener("orientationchange", updateSafeArea);
      window.removeEventListener("resize", updateSafeArea);
    };
  }, []);

  return insets;
}
