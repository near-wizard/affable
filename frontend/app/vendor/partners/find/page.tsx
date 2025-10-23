'use client';

import { useState } from 'react';
import { Search, Star, Award, TrendingUp, Users, Mail, ExternalLink } from 'lucide-react';
import { usePartners } from '@/hooks/use-api';
import { GridSkeleton, ErrorBoundary, EmptyState } from '@/components/loading-skeleton';
import type { Partner } from '@/types/api';

const partnerTypes = ['All', 'Content Creator', 'Community', 'Agency', 'Influencer', 'Advisor', 'Educator', 'Reseller'];

const tierBadgeColor = {
  standard: 'bg-slate-100 text-slate-800',
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-zinc-100 text-zinc-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
};

export default function FindPartnersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [page, setPage] = useState(1);

  // Fetch partners from API
  const { data: partnersResponse, loading, error } = usePartners({
    page,
    limit: 12,
    search: searchQuery,
    type: selectedType !== 'All' ? selectedType : undefined,
    verified_only: true,
  });

  const partners = partnersResponse?.data || [];
  const filteredPartners = partners;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={32} className="text-blue-600" /> Find Partners
            </h1>
            <p className="text-gray-600 mt-1">Discover verified affiliates to grow your program</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && <ErrorBoundary error={error.message} />}

        {/* Loading State */}
        {loading && !error ? (
          <GridSkeleton columns={3} items={6} />
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search partners</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or bio..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to page 1 on search
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">Partner Type</label>
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredPartners.length}</span> partner
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
                  <div key={partner.partner_id || partner.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                    {/* Header with Tier Badge */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
                            {partner.verified && <Award className="h-4 w-4 text-blue-600" />}
                          </div>
                          <p className="text-sm text-gray-600">{partner.email}</p>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${tierBadgeColor[partner.tier as keyof typeof tierBadgeColor]}`}>
                          {partner.tier}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">{partner.bio}</p>

                      {/* Type Tags */}
                      {partner.types && (
                        <div className="flex flex-wrap gap-2">
                          {partner.types.map((type) => (
                            <span
                              key={type}
                              className="inline-block px-2.5 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    {partner.rating !== undefined && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Rating</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(partner.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{(partner.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Campaigns</div>
                        <div className="text-lg font-bold text-gray-900">{partner.campaign_count || 0}</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Conversions</div>
                        <div className="text-lg font-bold text-gray-900">{(partner.total_conversions || 0).toLocaleString()}</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Revenue</div>
                        <div className="text-lg font-bold text-gray-900">${((partner.total_revenue || 0) / 1000000).toFixed(1)}M</div>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">High performer</span> in their category
                      </span>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2">
                      {(partner.website || partner.website_url) && (
                        <a href={partner.website || partner.website_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <button className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
                            <ExternalLink className="h-4 w-4" />
                            Visit
                          </button>
                        </a>
                      )}
                      <button className={`${partner.website ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium`}>
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
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page <span className="font-semibold">{page}</span> of{' '}
                      <span className="font-semibold">{partnersResponse.total_pages}</span>
                    </span>
                    <button
                      onClick={() => setPage(Math.min(partnersResponse.total_pages!, page + 1))}
                      disabled={page === partnersResponse.total_pages}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
          <div className="bg-white rounded-lg shadow p-6">
            <Award className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Verified Partners</h3>
            <p className="text-sm text-gray-600">
              All partners are verified and rated by previous vendors
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <TrendingUp className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Proven Track Record</h3>
            <p className="text-sm text-gray-600">
              See real performance metrics and conversion rates
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <Users className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Diverse Expertise</h3>
            <p className="text-sm text-gray-600">
              Find partners across industries and audience types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
