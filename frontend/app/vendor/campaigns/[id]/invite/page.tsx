"use client";

import { useParams, useRouter } from "next/navigation";
import { useCampaignDetail } from "@/hooks/use-api";
import { GridSkeleton, EmptyState } from "@/components/loading-skeleton";
import { PartnerInvitationForm } from "@/components/partner-invitation-form";
import { ArrowLeft } from "lucide-react";

export default function InvitePartnerPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const { data: campaign, loading: campaignLoading, error } = useCampaignDetail(campaignId);

  if (campaignLoading) {
    return <GridSkeleton columns={1} items={1} />;
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          title="Campaign not found"
          description="The campaign you're looking for doesn't exist."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-primary" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Invite Partner</h1>
              <p className="text-muted-foreground mt-1">{campaign.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invitation Form */}
          <div className="lg:col-span-2">
            <PartnerInvitationForm
              campaignId={campaignId}
              campaignName={campaign.name}
              onSuccess={() => {
                setTimeout(() => router.back(), 2000);
              }}
            />
          </div>

          {/* Campaign Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg p-6 border border-border sticky top-4">
              <h3 className="text-lg font-bold text-foreground mb-4">Campaign Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium text-foreground">{campaign.name}</p>
                </div>

                {campaign.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground">{campaign.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Commission Type</p>
                  <p className="font-medium text-foreground capitalize">
                    {campaign.commission_type === "percentage"
                      ? `${campaign.commission_value}%`
                      : `$${campaign.commission_value}`}
                  </p>
                </div>

                {campaign.destination_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">Destination URL</p>
                    <a
                      href={campaign.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {campaign.destination_url}
                    </a>
                  </div>
                )}

                {campaign.terms_url && (
                  <div>
                    <a
                      href={campaign.terms_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Terms & Conditions
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Partners will receive an email with campaign details, your company information,
                  and a link to sign up. They'll have 30 days to accept the invitation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
