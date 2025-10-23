"use client"
import { useState } from 'react';
import { Plus, Search, MoreVertical, Users, MousePointerClick, TrendingUp, DollarSign, Eye, Edit, Pause, Play, Megaphone } from 'lucide-react';
import { useCurrentVendor, useVendorCampaigns } from '@/hooks/use-api';
import { ErrorBoundary, EmptyState } from '@/components/loading-skeleton';
import type { Campaign } from '@/types/api';

export type CampaignStatus = 'active' | 'paused' | 'draft' | 'archived';

export default function VendorCampaigns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch vendor's campaigns (uses /me endpoint, no vendor ID needed)
  const { data: campaignsResponse, loading: campaignsLoading, error: campaignsError } = useVendorCampaigns(undefined, {
    page: 1,
    limit: 50,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const campaigns = campaignsResponse?.data || [];
  const loading = campaignsLoading;
  const error = campaignsError;

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (error) {
    return <ErrorBoundary error={error.message} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"> <Megaphone size={32} className="text-blue-600" /> Campaigns</h1>
              <p className="text-gray-600 mt-1">Manage your partner campaigns</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="space-y-6">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.campaign_id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-6">
                {/* Campaign Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      {campaign.status === 'active' ? (
                        <Pause size={20} className="text-gray-600" />
                      ) : (
                        <Play size={20} className="text-gray-600" />
                      )}
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <Edit size={20} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <MoreVertical size={20} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                  <StatBox
                    icon={<Users size={16} className="text-blue-600" />}
                    label="Active Partners"
                    value={campaign.partner_count || 0}
                  />
                  <StatBox
                    icon={<MousePointerClick size={16} className="text-purple-600" />}
                    label="Total Clicks"
                    value={(campaign.total_clicks || 0).toLocaleString()}
                  />
                  <StatBox
                    icon={<TrendingUp size={16} className="text-green-600" />}
                    label="Conversions"
                    value={campaign.conversion_count || 0}
                  />
                  <StatBox
                    icon={<TrendingUp size={16} className="text-orange-600" />}
                    label="Conv. Rate"
                    value={`${campaign.conversion_rate || 0}%`}
                  />
                  <StatBox
                    icon={<DollarSign size={16} className="text-green-600" />}
                    label="Total Revenue"
                    value={`$${(campaign.total_revenue || 0).toLocaleString()}`}
                  />
                  <StatBox
                    icon={<DollarSign size={16} className="text-blue-600" />}
                    label="Commission"
                    value={`$${(campaign.total_commission || 0).toLocaleString()}`}
                  />
                </div>

                {/* Campaign Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => window.location.href = `/vendor/campaigns/${campaign.campaign_id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                  <button
                    onClick={() => window.location.href = `/vendor/campaigns/${campaign.campaign_id}/partners`}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Users size={16} />
                    Manage Partners
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <EmptyState
            title="No campaigns found"
            description={searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first campaign'}
            action={!searchQuery ? {
              label: 'Create Campaign',
              onClick: () => setShowCreateModal(true),
            } : undefined}
          />
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

type StatBoxProps = {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    badge?: string; // optional, can be undefined
  };

function StatBox({ icon, label, value, badge }: StatBoxProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      {badge && (
        <div className="text-xs text-orange-600 mt-1">{badge}</div>
      )}
    </div>
  );
}

type CommissionType = 'flat' | 'percentage' | 'tiered'

type Tier = {
  id: number
  min: number
  max?: number
  rewardType: 'flat' | 'percentage'
  rewardValue: number
}

export function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    destinationUrl: '',
    commissionType: 'percentage' as CommissionType,
    commissionValue: '',
    cookieDuration: 30,
    approvalRequired: false,
    isPublic: true,
    tiers: [] as Tier[],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating campaign:', formData)
    // Here you would send formData to your API
    onClose()
  }

  const addTier = () => {
    setFormData((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        { id: Date.now(), min: 0, max: undefined, rewardType: 'percentage', rewardValue: 0 },
      ],
    }))
  }

  const updateTier = (id: number, key: keyof Tier, value: any) => {
    setFormData((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === id ? { ...t, [key]: value } : t)),
    }))
  }

  const removeTier = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((t) => t.id !== id),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination URL *
            </label>
            <input
              type="url"
              required
              value={formData.destinationUrl}
              onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yoursite.com/signup"
            />
            <p className="text-sm text-gray-600 mt-1">
              Use {'{partner_id}'} as a placeholder for the partner ID
            </p>
          </div>

          {/* Commission Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Type *
            </label>
            <select
              value={formData.commissionType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commissionType: e.target.value as CommissionType,
                  commissionValue: '',
                  tiers: [],
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Amount</option>
              <option value="tiered">Tiered</option>
            </select>
          </div>

          {/* Single Commission Value */}
          {formData.commissionType !== 'tiered' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Value *
              </label>
              <div className="relative">
                {formData.commissionType === 'percentage' && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                )}
                {formData.commissionType === 'flat' && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                )}
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.commissionValue}
                  onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.commissionType === 'flat' ? 'pl-8' : 'pr-8'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Tiered Commission */}
          {formData.commissionType === 'tiered' && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tiers</h3>
              <div className="space-y-3">
                {formData.tiers.map((tier) => (
                  <div key={tier.id} className="grid grid-cols-5 gap-2 items-center">
                    <input
                      type="number"
                      title='Minimum number of conversions to qualify for tier'
                      min={0}
                      value={tier.min}
                      onChange={(e) => updateTier(tier.id, 'min', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Min"
                    />
                    <input
                      title='Maximum number of conversions covered in the tier'
                      type="number"
                      min={0}
                      value={tier.max ?? ''}
                      onChange={(e) =>
                        updateTier(tier.id, 'max', e.target.value === '' ? undefined : parseFloat(e.target.value))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Max"
                    />
                    <input
                      type="number"
                      title='Reward Value'
                      min={0}
                      step={0.01}
                      value={tier.rewardValue}
                      onChange={(e) => updateTier(tier.id, 'rewardValue', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Reward"
                    />
                    <select
                      value={tier.rewardType}
                      onChange={(e) => updateTier(tier.id, 'rewardType', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="percentage">%</option>
                      <option value="flat">$</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      className="text-red-500 px-2 py-1 border border-red-500 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Tier
                </button>
              </div>
            </div>
          )}

          {/* Other fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cookie Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.cookieDuration}
              onChange={(e) => setFormData({ ...formData, cookieDuration: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.approvalRequired}
                onChange={(e) => setFormData({ ...formData, approvalRequired: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Require manual approval for partner applications
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Make campaign publicly visible to all partners
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Create Campaign
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}