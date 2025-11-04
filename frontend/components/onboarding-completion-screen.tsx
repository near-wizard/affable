"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Zap, BookOpen } from "lucide-react";

interface OnboardingCompletionScreenProps {
  onClose?: () => void;
  campaignCount?: number;
}

/**
 * Completion screen shown after all onboarding steps are finished
 * Displays celebration message and next-step recommendations
 */
export function OnboardingCompletionScreen({
  onClose,
  campaignCount = 1,
}: OnboardingCompletionScreenProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Trigger confetti animation (you could integrate a confetti library here)
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const recommendations = [
    {
      id: "team",
      icon: Users,
      title: "Add Team Members",
      description: "Invite your team to manage campaigns together",
      action: "Invite Team",
      href: "/vendor/settings/team",
    },
    {
      id: "marketplace",
      icon: BookOpen,
      title: "Explore Partner Marketplace",
      description: "Find and connect with influencers and affiliates",
      action: "Browse Marketplace",
      href: "/vendor/partners/marketplace",
    },
    {
      id: "advanced",
      icon: Zap,
      title: "Configure Advanced Settings",
      description: "Set up tiered commissions and attribution models",
      action: "Configure",
      href: "/vendor/campaigns",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full space-y-6 p-8">
        {/* Celebration Header */}
        <div className="text-center space-y-4">
          {showConfetti && (
            <div className="text-5xl animate-bounce">🎉</div>
          )}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">
              You're All Set!
            </h2>
            <p className="text-gray-600 text-lg">
              You've successfully completed your onboarding and created your first campaign.
              You're ready to start earning commissions!
            </p>
          </div>
        </div>

        {/* Accomplishment Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900">
                Account Verified & Ready
              </h3>
              <p className="text-sm text-green-800 mt-1">
                Your payment method is verified, campaign is live, and ready to accept partners.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps Recommendations */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">What's Next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec) => {
              const Icon = rec.icon;
              return (
                <button
                  key={rec.id}
                  onClick={() => {
                    router.push(rec.href);
                    onClose?.();
                  }}
                  className="border border-gray-200 rounded-lg p-4 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                >
                  <Icon className="h-6 w-6 text-gray-600 mb-2 group-hover:text-blue-600 transition-colors" />
                  <h4 className="font-medium text-sm text-gray-900">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {rec.description}
                  </p>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      {rec.action} →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              router.push("/vendor/dashboard");
              onClose?.();
            }}
            className="flex-1"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => onClose?.()}
            className="flex-1"
          >
            Close
          </Button>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold text-blue-900">Quick Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Monitor your campaign performance in real-time on the dashboard</li>
            <li>• Reach out to partners to grow your affiliate network</li>
            <li>• Review and optimize your commission structure as needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
