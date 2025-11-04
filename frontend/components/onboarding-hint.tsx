"use client";

import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface OnboardingHintProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  hintId: string;
  children: React.ReactNode;
}

/**
 * Reusable component for displaying contextual onboarding hints
 * Uses Popover to display hints without blocking the main UI
 */
export function OnboardingHint({
  title,
  description,
  actionText = "Got it",
  onAction,
  hintId,
  children,
}: OnboardingHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Load dismissed hints from localStorage
  useEffect(() => {
    const dismissedHints = localStorage.getItem("dismissedHints");
    if (dismissedHints) {
      const hints = JSON.parse(dismissedHints);
      if (hints[hintId]) {
        setIsDismissed(true);
      }
    }
  }, [hintId]);

  const handleDismiss = () => {
    const dismissedHints = JSON.parse(localStorage.getItem("dismissedHints") || "{}");
    dismissedHints[hintId] = true;
    localStorage.setItem("dismissedHints", JSON.stringify(dismissedHints));
    setIsDismissed(true);
    setIsOpen(false);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    handleDismiss();
  };

  // Show hint after a short delay to avoid overwhelming the user
  useEffect(() => {
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  if (isDismissed) {
    return <>{children}</>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm leading-none">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleAction}
              className="w-full"
            >
              {actionText}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline hint variant - displays as a small callout box instead of popover
 */
interface InlineHintProps {
  title: string;
  description: string;
  variant?: "default" | "info" | "success" | "warning";
  hintId: string;
  onDismiss?: () => void;
}

export function InlineHint({
  title,
  description,
  variant = "info",
  hintId,
  onDismiss,
}: InlineHintProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissedHints = localStorage.getItem("dismissedHints");
    if (dismissedHints) {
      const hints = JSON.parse(dismissedHints);
      if (hints[hintId]) {
        setIsDismissed(true);
      }
    }
  }, [hintId]);

  const handleDismiss = () => {
    const dismissedHints = JSON.parse(localStorage.getItem("dismissedHints") || "{}");
    dismissedHints[hintId] = true;
    localStorage.setItem("dismissedHints", JSON.stringify(dismissedHints));
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) {
    return null;
  }

  const variantClasses = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm opacity-90">{description}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 h-6 w-6 rounded-md hover:bg-black/10 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
