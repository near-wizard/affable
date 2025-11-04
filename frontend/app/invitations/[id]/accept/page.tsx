"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const acceptInvitation = async () => {
      try {
        // Get the invitation details to retrieve partner email
        const response = await apiClient.campaigns.getInvitation(invitationId);

        if (response && response.data) {
          const invitation = response.data;
          const partnerEmail = invitation.partner_email;

          // Redirect to signup with email and invitation token prefilled
          router.push(
            `/signup?email=${encodeURIComponent(
              partnerEmail
            )}&invitation=${invitationId}`
          );
        } else {
          setError("Invalid invitation");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to process invitation:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process invitation"
        );
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [invitationId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-muted">
        <div className="bg-card p-8 rounded-2xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-semibold text-center mb-4 text-destructive">
            Invalid Invitation
          </h1>
          <p className="text-center text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push("/signup")}
            className="w-full bg-primary text-white rounded-lg py-2 hover:bg-primary/90 transition"
          >
            Go to Sign Up
          </button>
        </div>
      </div>
    );
  }

  return null;
}
