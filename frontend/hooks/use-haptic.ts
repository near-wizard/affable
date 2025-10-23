"use client";

/**
 * Haptic feedback patterns using the Vibration API
 * Works on most mobile devices - gracefully degrades on devices without haptic support
 */

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

/**
 * Hook to trigger haptic feedback on mobile devices
 * Uses the Vibration API (navigator.vibrate)
 */
export function useHaptic() {
  const isSupported = () => {
    if (typeof window === "undefined") return false;
    return "vibrate" in navigator;
  };

  const vibrate = (pattern: number | number[]) => {
    if (!isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration not supported
      console.debug("Haptic feedback not supported");
    }
  };

  const haptic = (type: HapticPattern) => {
    switch (type) {
      case "light":
        // Light tap - 10ms
        vibrate(10);
        break;
      case "medium":
        // Medium press - 20ms, 10ms gap, 20ms
        vibrate([20, 10, 20]);
        break;
      case "heavy":
        // Heavy action - 40ms, 10ms gap, 40ms
        vibrate([40, 10, 40]);
        break;
      case "success":
        // Success pattern - quick double tap
        vibrate([10, 50, 10]);
        break;
      case "warning":
        // Warning pattern - longer vibration
        vibrate([30, 20, 30, 20, 30]);
        break;
      case "error":
        // Error pattern - strong vibrations
        vibrate([50, 30, 50, 30, 50]);
        break;
    }
  };

  return {
    isSupported,
    vibrate,
    haptic,
    // Convenience methods
    light: () => haptic("light"),
    medium: () => haptic("medium"),
    heavy: () => haptic("heavy"),
    success: () => haptic("success"),
    warning: () => haptic("warning"),
    error: () => haptic("error"),
  };
}
