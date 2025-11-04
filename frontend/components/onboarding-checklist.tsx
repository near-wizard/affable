"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVendorOnboarding } from "@/hooks/use-vendor-onboarding";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  className?: string;
}

/**
 * Sidebar checklist component showing onboarding progress
 * Displays the 4 key onboarding steps and their completion status
 */
export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const { onboarding, loading, markStepComplete, dismissOnboarding } = useVendorOnboarding();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  if (!onboarding || onboarding.status === "completed") {
    return null;
  }

  const steps = [
    {
      id: "stripe_verified",
      title: "Connect Stripe Account",
      description: "Set up payment processing to get paid for conversions",
      action: "Connect Stripe",
      href: "/vendor/settings/billing",
    },
    {
      id: "campaign_created",
      title: "Create Your First Campaign",
      description: "Set up your first affiliate marketing campaign",
      action: "Create Campaign",
      href: "/vendor/campaigns?new=true",
    },
    {
      id: "campaign_launched",
      title: "Launch Campaign",
      description: "Verify all requirements and launch your campaign live",
      action: "Launch Campaign",
      href: "/vendor/campaigns",
    },
    {
      id: "partners_invited",
      title: "Invite Partners",
      description: "Invite influencers and affiliates to promote your campaign",
      action: "Invite Partners",
      href: "/vendor/campaigns",
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (!onboarding.completed_steps) return "pending";
    return onboarding.completed_steps.includes(stepId) ? "completed" : "pending";
  };

  const toggleStepExpand = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleDismiss = async () => {
    try {
      await dismissOnboarding();
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to dismiss onboarding:", error);
    }
  };

  const progressPercentage = Math.round(onboarding.progress_percentage || 0);
  const completedCount = onboarding.completed_steps?.length || 0;

  if (!isExpanded) {
    return (
      <div className={cn("fixed top-20 right-6 z-40", className)}>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="rounded-full"
        >
          Setup Progress: {progressPercentage}%
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">
            Welcome to Affable!
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {completedCount} of 4 steps completed
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = getStepStatus(step.id) === "completed";
          const isExpanded = expandedSteps.has(step.id);
          const stepNumber = index + 1;

          return (
            <div key={step.id}>
              <button
                onClick={() => toggleStepExpand(step.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                  isCompleted
                    ? "bg-green-50 hover:bg-green-100"
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                {/* Step Number/Check Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-green-900" : "text-gray-900"
                    )}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0 text-gray-400">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && !isCompleted && (
                <div className="ml-9 mt-2 mb-2 p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <a href={step.href} className="block">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                    >
                      {step.action}
                    </Button>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dismiss Button */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-500 hover:text-gray-700 w-full text-center py-2"
        >
          Dismiss for now
        </button>
      </div>
    </div>
  );
}
