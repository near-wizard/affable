"use client"
import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Users, MousePointerClick, TrendingUp, DollarSign, Eye, Edit, Pause, Play } from 'lucide-react';

export type CampaignStatus = 'active' | 'paused' | 'draft' | 'archived';

export type CampaignData = {
  id: number;
  name: string;
  status: CampaignStatus;
  activePartners: number;
  pendingPartners: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  commissionRate: number; // Can represent either % or fixed amount depending on campaign
  createdAt: string; // ISO or YYYY-MM-DD format
};

export default function VendorCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // Mock data - in production, fetch from API
      setCampaigns([
        {
          id: 1,
          name: 'Acme SaaS Launch 2025',
          status: 'active',
          activePartners: 8,
          pendingPartners: 3,
          totalClicks: 4750,
          totalConversions: 128,
          conversionRate: 2.69,
          totalRevenue: 25600,
          totalCommission: 5120,
          commissionRate: 20,
          createdAt: '2024-09-01',
        },
        {
          id: 2,
          name: 'Acme Enterprise Plan',
          status: 'active',
          activePartners: 3,
          pendingPartners: 1,
          totalClicks: 890,
          totalConversions: 5,
          conversionRate: 0.56,
          totalRevenue: 25000,
          totalCommission: 2500,
          commissionRate: 500,
          createdAt: '2024-08-15',
        },
        {
          id: 3,
          name: 'Summer Promotion 2024',
          status: 'paused',
          activePartners: 12,
          pendingPartners: 0,
          totalClicks: 9780,
          totalConversions: 209,
          conversionRate: 2.14,
          totalRevenue: 17800,
          totalCommission: 3560,
          commissionRate: 15,
          createdAt: '2024-06-01',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
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
            <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
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
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
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
                    value={campaign.activePartners}
                    badge={campaign.pendingPartners > 0 ? `${campaign.pendingPartners} pending` : undefined}
                  />
                  <StatBox
                    icon={<MousePointerClick size={16} className="text-purple-600" />}
                    label="Total Clicks"
                    value={campaign.totalClicks.toLocaleString()}
                  />
                  <StatBox
                    icon={<TrendingUp size={16} className="text-green-600" />}
                    label="Conversions"
                    value={campaign.totalConversions}
                  />
                  <StatBox
                    icon={<TrendingUp size={16} className="text-orange-600" />}
                    label="Conv. Rate"
                    value={`${campaign.conversionRate}%`}
                  />
                  <StatBox
                    icon={<DollarSign size={16} className="text-green-600" />}
                    label="Total Revenue"
                    value={`$${campaign.totalRevenue.toLocaleString()}`}
                  />
                  <StatBox
                    icon={<DollarSign size={16} className="text-blue-600" />}
                    label="Commission"
                    value={`$${campaign.totalCommission.toLocaleString()}`}
                  />
                </div>

                {/* Campaign Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => window.location.href = `/vendor/campaigns/${campaign.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                  <button
                    onClick={() => window.location.href = `/vendor/campaigns/${campaign.id}/partners`}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Users size={16} />
                    Manage Partners
                  </button>
                  {campaign.pendingPartners > 0 && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      {campaign.pendingPartners} pending applications
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first campaign'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Create Campaign
              </button>
            )}
          </div>
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

function CreateCampaignModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    destinationUrl: '',
    commissionType: 'percentage',
    commissionValue: '',
    cookieDuration: 30,
    approvalRequired: false,
    isPublic: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, submit to API
    console.log('Creating campaign:', formData);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Spring Launch 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your campaign and what partners should promote"
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
              onChange={(e) => setFormData({...formData, destinationUrl: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yoursite.com/signup"
            />
            <p className="text-sm text-gray-600 mt-1">
              Use {'{partner_id}'} as a placeholder for the partner ID
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Type *
              </label>
              <select
                value={formData.commissionType}
                onChange={(e) => setFormData({...formData, commissionType: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
            </div>

            <div>
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
                  onChange={(e) => setFormData({...formData, commissionValue: e.target.value})}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.commissionType === 'flat' ? 'pl-8' : 'pr-8'
                  }`}
                  placeholder={formData.commissionType === 'percentage' ? '20' : '50.00'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cookie Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.cookieDuration}
              onChange={(e) => setFormData({...formData, cookieDuration: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.approvalRequired}
                onChange={(e) => setFormData({...formData, approvalRequired: e.target.checked})}
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
                onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Make campaign publicly visible to all partners
              </span>
            </label>
          </div>

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
  );
}