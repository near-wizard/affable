'use client';

import { useState } from 'react';
import { Users, Search, Mail, Table, Grid, DollarSign, TrendingUp, MousePointerClick, ChevronUp, ChevronDown } from 'lucide-react';
import { useCurrentVendor, useVendorCampaigns, useCampaignPartners } from '@/hooks/use-api';
import { GridSkeleton, ErrorBoundary, EmptyState } from '@/components/loading-skeleton';

export default function CurrentPartnersPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Fetch current vendor info
  const { data: vendor, loading: vendorLoading, error: vendorError } = useCurrentVendor();

  // Fetch vendor's campaigns
  const { data: campaignsResponse, loading: campaignsLoading } = useVendorCampaigns(
    vendor?.vendor_id?.toString(),
    {
      page: 1,
      limit: 100,
      status: 'active'
    }
  );

  const campaigns = campaignsResponse?.data || [];

  // Set the first campaign as selected by default
  const campaignIdToUse = selectedCampaignId || (campaigns.length > 0 ? campaigns[0].campaign_id?.toString() : null);

  // Fetch campaign partners for the selected campaign
  const { data: partnersResponse, loading: partnersLoading, error: partnersError } = useCampaignPartners(
    campaignIdToUse || undefined,
    {
      page: 1,
      limit: 50,
      status: 'approved',
    }
  );

  const partners = partnersResponse?.data || [];
  const loading = vendorLoading || partnersLoading || campaignsLoading;
  const error = vendorError || partnersError;

  // Handle no campaigns scenario
  if (!loading && campaigns.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={32} className="text-blue-600" /> Current Partners
            </h1>
            <p className="text-gray-600 mt-1">Manage your active affiliate partners</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            title="No campaigns found"
            description="Create a campaign first to start adding partners"
            action={{
              label: 'Create Campaign',
              onClick: () => window.location.href = '/vendor/campaigns'
            }}
          />
        </div>
      </div>
    );
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPartners = [...partners].filter(p => {
    const name = p.name || p.partner_name || '';
    const email = (p.email || p.partner_email || '');
    return name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    if (!sortColumn) return 0;
    let aValue: any = (a as any)[sortColumn];
    let bValue: any = (b as any)[sortColumn];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={32} className="text-blue-600" /> Current Partners
              </h1>
              <p className="text-gray-600 mt-1">Manage your active affiliate partners</p>
            </div>
          </div>

          {/* Campaign Selector */}
          {campaigns.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
              <select
                value={campaignIdToUse || ''}
                onChange={(e) => setSelectedCampaignId(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.campaign_id} value={campaign.campaign_id?.toString() || ''}>
                    {campaign.name} ({campaign.partner_count || 0} partners)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                } flex items-center gap-1`}
              >
                <Table size={16} /> Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                } flex items-center gap-1`}
              >
                <Grid size={16} /> Card
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search partners..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && <ErrorBoundary error={error.message} />}

        {/* Loading State */}
        {loading && !error ? (
          <GridSkeleton columns={3} items={6} />
        ) : (
          <>
            {viewMode === 'table' ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow sm:px-0 lg:px-0 py-0">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                  <thead>
                    <tr>
                      {['name','email','status','total_revenue','approved_conversions','pending_commission','click_count','created_at'].map(column => (
                        <th
                        key={column}
                        onClick={() => handleSort(column)}
                        className="px-3 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span>{column.charAt(0).toUpperCase() + column.slice(1).replace(/_/g, ' ')}</span>
                          <div className="flex flex-col justify-center">
                            <ChevronUp size={10} className={`${sortColumn === column && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown size={10} className={`${sortColumn === column && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      ))}
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedPartners.map(p => (
                      <tr key={p.partner_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 font-medium">{p.name || p.partner_name}</td>
                        <td className="px-6 py-4 text-gray-700">{p.email || p.partner_email || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">${(p.total_revenue || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-700">{p.total_conversions || 0}</td>
                        <td className="px-6 py-4 text-gray-700">${(p.total_commission_earned || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-700">{(p.total_clicks || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{p.applied_at ? new Date(p.applied_at).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <Mail size={20} className="text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedPartners.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-gray-400 py-4">
                          No partners found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPartners.map(p => (
                  <div key={p.partner_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{p.name || p.partner_name}</h2>
                    <p className="text-gray-700 mb-2">{p.email || p.partner_email || 'No email'}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Unknown'}
                    </span>

                    {/* Partner Stat Boxes */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <StatBox icon={<DollarSign size={16} className="text-green-600" />} label="Revenue" value={`$${(p.total_revenue || 0).toLocaleString()}`} />
                      <StatBox icon={<TrendingUp size={16} className="text-blue-600" />} label="Conversions" value={p.total_conversions || 0} />
                      <StatBox icon={<DollarSign size={16} className="text-orange-600" />} label="Commission" value={`$${(p.total_commission_earned || 0).toLocaleString()}`} />
                      <StatBox icon={<MousePointerClick size={16} className="text-purple-600" />} label="Clicks" value={p.total_clicks || 0} />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm">
                        <Mail size={16} /> Message
                      </button>
                    </div>
                  </div>
                ))}
                {sortedPartners.length === 0 && (
                  <EmptyState
                    title="No partners found"
                    description="You haven't added any partners to this campaign yet."
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type StatBoxProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
};

function StatBox({ icon, label, value }: StatBoxProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm text-gray-600">{icon}<span>{label}</span></div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}
