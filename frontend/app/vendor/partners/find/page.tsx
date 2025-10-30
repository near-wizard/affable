'use client';

import { useState } from 'react';
import { Search, Star, Award, TrendingUp, Users, Mail, ExternalLink, X } from 'lucide-react';
import { usePartners, useVendorCampaigns } from '@/hooks/use-api';
import { GridSkeleton, ErrorBoundary, EmptyState } from '@/components/loading-skeleton';
import { apiClient } from '@/lib/api-client';
import type { Partner } from '@/types/api';

const partnerTypes = ['All', 'Content Creator', 'Community', 'Agency', 'Influencer', 'Advisor', 'Educator', 'Reseller'];

const tierBadgeColor = {
  standard: 'bg-muted text-slate-800',
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-zinc-100 text-zinc-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
};

interface InviteState {
  partnerId: number;
  partnerName: string;
  selectedCampaignId: number | null;
  message: string;
}

export default function FindPartnersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [page, setPage] = useState(1);
  const [inviteState, setInviteState] = useState<InviteState | null>(null);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners from API
  const { data: partnersResponse, loading, error: partnersError } = usePartners({
    page,
    limit: 12,
    search: searchQuery,
    type: selectedType !== 'All' ? selectedType : undefined,
    verified_only: true,
  });

  // Fetch vendor campaigns for inviting
  const { data: campaignsResponse } = useVendorCampaigns(undefined, {
    page: 1,
    limit: 100,
    status: 'active',
  });

  const partners = partnersResponse?.data || [];
  const campaigns = campaignsResponse?.campaigns || [];
  const filteredPartners = partners;

  const handleOpenInvite = (partner: Partner) => {
    setInviteState({
      partnerId: partner.partner_id || partner.id!,
      partnerName: partner.name,
      selectedCampaignId: campaigns.length > 0 ? campaigns[0].campaign_id : null,
      message: '',
    });
    setError(null);
  };

  const handleSendInvite = async () => {
    if (!inviteState || !inviteState.selectedCampaignId) {
      setError('Please select a campaign');
      return;
    }

    setInviting(true);
    setError(null);

    try {
      await apiClient.campaigns.invitePartner(inviteState.selectedCampaignId, {
        partner_id: inviteState.partnerId,
        invitation_message: inviteState.message,
      });
      setInviteState(null);
      // You might want to show a success message here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users size={32} className="text-primary" /> Find Partners
            </h1>
            <p className="text-muted-foreground mt-1">Discover verified affiliates to grow your program</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {partnersError && <ErrorBoundary error={partnersError.message} />}

        {/* Loading State */}
        {loading && !partnersError ? (
          <GridSkeleton columns={3} items={6} />
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-foreground mb-2">Search partners</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or bio..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to page 1 on search
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-foreground mb-3">Partner Type</label>
              <div className="flex flex-wrap gap-2">
                {partnerTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setPage(1); // Reset to page 1 on type change
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedType === type
                        ? 'border border-blueberry bg-primary/100 text-white'
                        : 'bg-background border border-border text-foreground hover:border-border'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredPartners.length}</span> partner
                {filteredPartners.length !== 1 ? 's' : ''}
                {partnersResponse?.total !== undefined && (
                  <span> of <span className="font-semibold">{partnersResponse.total}</span> total</span>
                )}
              </p>
            </div>

            {/* Partner Grid */}
            {filteredPartners.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
                  {filteredPartners.map((partner) => (
                  <div key={partner.partner_id || partner.id} className="bg-background rounded-lg shadow hover:shadow-lg transition p-6">
                    {/* Header with Tier Badge */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-foreground">{partner.name}</h3>
                            {partner.verified && <Award className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{partner.email}</p>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${tierBadgeColor[partner.tier as keyof typeof tierBadgeColor]}`}>
                          {partner.tier}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{partner.bio}</p>

                      {/* Type Tags */}
                      {partner.types && (
                        <div className="flex flex-wrap gap-2">
                          {partner.types.map((type) => (
                            <span
                              key={type}
                              className="inline-block px-2.5 py-1 bg-muted border border-border rounded text-xs font-medium text-foreground"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    {partner.rating !== undefined && (
                      <div className="mb-4 p-3 bg-background border border-border rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Rating</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(partner.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{(partner.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Campaigns</div>
                        <div className="text-lg font-bold text-foreground">{partner.campaign_count || 0}</div>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Conversions</div>
                        <div className="text-lg font-bold text-foreground">{(partner.total_conversions || 0).toLocaleString()}</div>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                        <div className="text-lg font-bold text-foreground">${((partner.total_revenue || 0) / 1000000).toFixed(1)}M</div>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    <div className="mb-6 p-3 bg-primary/10 border border-border rounded-lg flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">
                        <span className="font-semibold text-foreground">High performer</span> in their category
                      </span>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2">
                      {(partner.website || partner.website_url) && (
                        <a href={partner.website || partner.website_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <button className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition text-sm font-medium">
                            <ExternalLink className="h-4 w-4" />
                            Visit
                          </button>
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenInvite(partner)}
                        className={`${partner.website ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1 px-3 py-2 border border-blueberry bg-primary/100 text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium`}>
                        <Mail className="h-4 w-4" />
                        Invite
                      </button>
                    </div>
                  </div>
                ))}
                </div>

                {/* Pagination */}
                {partnersResponse?.total_pages && partnersResponse.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mb-12">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page <span className="font-semibold">{page}</span> of{' '}
                      <span className="font-semibold">{partnersResponse.total_pages}</span>
                    </span>
                    <button
                      onClick={() => setPage(Math.min(partnersResponse.total_pages!, page + 1))}
                      disabled={page === partnersResponse.total_pages}
                      className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No partners found"
                description="Try adjusting your search filters to find more partners"
                action={{
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedType('All');
                    setPage(1);
                  },
                }}
              />
            )}
          </>
        )}

        {/* Info Section */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-background rounded-lg shadow p-6">
            <Award className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Verified Partners</h3>
            <p className="text-sm text-muted-foreground">
              All partners are verified and rated by previous vendors
            </p>
          </div>
          <div className="bg-background rounded-lg shadow p-6">
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Proven Track Record</h3>
            <p className="text-sm text-muted-foreground">
              See real performance metrics and conversion rates
            </p>
          </div>
          <div className="bg-background rounded-lg shadow p-6">
            <Users className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Diverse Expertise</h3>
            <p className="text-sm text-muted-foreground">
              Find partners across industries and audience types
            </p>
          </div>
        </div>

        {/* Invite Modal */}
        {inviteState && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Invite {inviteState.partnerName}</h3>
                <button
                  onClick={() => setInviteState(null)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                  <p>You need to create an active campaign first before inviting partners.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Campaign
                    </label>
                    <select
                      value={inviteState.selectedCampaignId || ''}
                      onChange={(e) =>
                        setInviteState({
                          ...inviteState,
                          selectedCampaignId: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    >
                      <option value="">Select a campaign...</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.campaign_id} value={campaign.campaign_id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={inviteState.message}
                      onChange={(e) =>
                        setInviteState({
                          ...inviteState,
                          message: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      placeholder="Add a personal message to the invitation..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-border">
                    <button
                      onClick={() => setInviteState(null)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendInvite}
                      disabled={inviting || !inviteState.selectedCampaignId}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      {inviting ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
