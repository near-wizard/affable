"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface OnboardingState {
  vendor_id: number;
  status: "not_started" | "in_progress" | "completed";
  completed_steps: string[];
  dismissed_at: string | null;
  completed_at: string | null;
  progress_percentage: number;
}

interface UseVendorOnboardingReturn {
  onboarding: OnboardingState | null;
  loading: boolean;
  error: Error | null;
  markStepComplete: (step: string) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  refetchOnboarding: () => Promise<void>;
  isFirstTimeUser: boolean;
}

/**
 * Hook to manage vendor onboarding state and actions
 * Handles fetching onboarding progress and marking steps as complete
 */
export function useVendorOnboarding(): UseVendorOnboardingReturn {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch onboarding state on component mount
  useEffect(() => {
    const fetchOnboarding = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/v1/vendors/me/onboarding");
        setOnboarding(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch onboarding state"));
      } finally {
        setLoading(false);
      }
    };

    fetchOnboarding();
  }, []);

  // Listen for storage changes to sync across tabs/instances and custom events for same instance
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      console.log('StorageEvent received:', e.key);
      if (e.key === 'onboarding-update-trigger') {
        console.log('Detected onboarding update trigger in storage');
        const fetchUpdated = async () => {
          try {
            const response = await apiClient.get("/v1/vendors/me/onboarding");
            console.log('Refetched after storage change:', response);
            setOnboarding(response);
          } catch (err) {
            console.error("Failed to refetch onboarding:", err);
          }
        };
        fetchUpdated();
      }
    };

    // Listen for custom event (for same instance updates)
    const handleOnboardingUpdate = (event: Event) => {
      console.log('Custom onboarding-updated event received');
      const fetchUpdated = async () => {
        try {
          const response = await apiClient.get("/v1/vendors/me/onboarding");
          console.log('Refetched after custom event:', response);
          setOnboarding(response);
        } catch (err) {
          console.error("Failed to refetch onboarding:", err);
        }
      };
      fetchUpdated();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('onboarding-updated', handleOnboardingUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('onboarding-updated', handleOnboardingUpdate as EventListener);
    };
  }, []);

  // Refetch onboarding state
  const refetchOnboarding = useCallback(async () => {
    try {
      const response = await apiClient.get("/v1/vendors/me/onboarding");
      setOnboarding(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch onboarding state"));
    }
  }, []);

  // Mark a step as complete
  const markStepComplete = useCallback(
    async (step: string) => {
      try {
        const response = await apiClient.put(
          `/v1/vendors/me/onboarding/step/${step}`,
          {}
        );
        console.log('API Response:', {
          step,
          completed_steps: response?.completed_steps,
          progress: response?.progress_percentage,
          status: response?.status
        });
        setOnboarding(response);
        console.log('State updated with:', response);

        // Dispatch custom event for same instance updates
        window.dispatchEvent(new Event('onboarding-updated'));

        // Also set localStorage to notify other instances/tabs
        localStorage.setItem('onboarding-update-trigger', Date.now().toString());
      } catch (err) {
        console.error('Error marking step complete:', err);
        setError(err instanceof Error ? err : new Error("Failed to mark step complete"));
        throw err;
      }
    },
    []
  );

  // Dismiss the onboarding checklist
  const dismissOnboarding = useCallback(async () => {
    try {
      const response = await apiClient.put(
        "/v1/vendors/me/onboarding/dismiss",
        {}
      );
      setOnboarding(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to dismiss onboarding"));
      throw err;
    }
  }, []);

  // Listen for page visibility changes to refetch when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refetching onboarding state');
        refetchOnboarding();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchOnboarding]);

  // Poll for updates every 3 seconds to catch changes from other operations
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling onboarding state');
      refetchOnboarding();
    }, 3000);

    return () => clearInterval(interval);
  }, [refetchOnboarding]);

  // Determine if this is a first-time user
  const isFirstTimeUser =
    onboarding?.status === "not_started" || onboarding?.status === "in_progress";

  return {
    onboarding,
    loading,
    error,
    markStepComplete,
    dismissOnboarding,
    refetchOnboarding,
    isFirstTimeUser,
  };
}
