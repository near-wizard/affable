'use client';

import { useState } from 'react';
import { Target, Search, Copy, ExternalLink, TrendingUp, DollarSign, MousePointerClick, ChevronUp, ChevronDown } from 'lucide-react';
import { useCurrentPartner, usePartnerCampaigns } from '@/hooks/use-api';
import { GridSkeleton, ErrorBoundary, EmptyState } from '@/components/loading-skeleton';
import type { PartnerCurrentCampaign } from '@/types/api';

export default function CurrentCampaignsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch current partner and their campaigns
  const { data: partner, loading: partnerLoading, error: partnerError } = useCurrentPartner();
  const { data: campaignsResponse, loading: campaignsLoading, error: campaignsError } = usePartnerCampaigns(partner?.id, {
    page: 1,
    limit: 50,
  });

  const campaigns = campaignsResponse?.data || [];
  const loading = partnerLoading || campaignsLoading;
  const error = partnerError || campaignsError;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedCampaigns = [...campaigns]
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.vendor_name && c.vendor_name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target size={32} className="text-blue-600" /> Current Campaigns
            </h1>
            <p className="text-gray-600 mt-1">Manage and track your active affiliate programs</p>
          </div>

          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                } flex items-center gap-1`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                } flex items-center gap-1`}
              >
                Card
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search campaigns..."
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
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {['name', 'vendor_name', 'status', 'clicks', 'conversion_count', 'conversion_rate', 'earned_commission', 'created_at'].map(column => (
                        <th
                          key={column}
                          onClick={() => handleSort(column)}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <span>{column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
                            <div className="flex flex-col justify-center">
                              <ChevronUp size={10} className={`${sortColumn === column && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                              <ChevronDown size={10} className={`${sortColumn === column && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-gray-900 font-medium">{c.name}</td>
                        <td className="px-4 py-4 text-gray-700">{c.vendor_name || 'Unknown'}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.status === 'active' ? 'bg-green-100 text-green-800' :
                            c.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{(c.click_count || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-gray-700">{c.conversion_count || 0}</td>
                        <td className="px-4 py-4 text-gray-700">{c.conversion_rate || 0}%</td>
                        <td className="px-4 py-4 text-gray-900 font-semibold">${(c.earned_commission || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-gray-500 text-sm">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-4">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ExternalLink size={18} className="text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-gray-400 py-4">
                          No campaigns found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCampaigns.map(c => (
                  <div key={c.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{c.name}</h2>
                        <p className="text-sm text-gray-600">{c.vendor_name || 'Unknown Vendor'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        c.status === 'active' ? 'bg-green-100 text-green-800' :
                        c.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Unknown'}
                      </span>
                    </div>

                    {/* Commission Badge */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Commission</span>
                        <span className="text-lg font-bold text-blue-600">
                          {c.commission_type === 'percentage' ? `${c.commission_value}%` : `$${c.commission_value}`}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <StatBox icon={<MousePointerClick size={16} className="text-blue-600" />} label="Clicks" value={c.click_count || 0} />
                      <StatBox icon={<TrendingUp size={16} className="text-green-600" />} label="Conv." value={c.conversion_count || 0} />
                      <StatBox icon={<DollarSign size={16} className="text-orange-600" />} label="Earned" value={`$${(c.earned_commission || 0).toLocaleString()}`} />
                      <StatBox icon={<TrendingUp size={16} className="text-purple-600" />} label="Rate" value={`${c.conversion_rate || 0}%`} />
                    </div>

                    <div className="mb-4 text-sm text-gray-600">
                      <span className="font-semibold">Joined:</span> {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                      <ExternalLink size={16} /> View Details
                    </button>
                  </div>
                ))}
                {sortedCampaigns.length === 0 && (
                  <EmptyState
                    title="No campaigns found"
                    description="You haven't enrolled in any campaigns yet. Explore campaigns to get started."
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
