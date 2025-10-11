"use client"
import { useState, useEffect } from 'react';
import { Plus, Copy, ExternalLink, BarChart2, Trash2, Edit2, Check } from 'lucide-react';

export default function PartnerLinks() {
  const [links, setLinks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    // Mock data
    setCampaigns([
      { id: 1, name: 'Acme SaaS Launch 2025' },
      { id: 2, name: 'Acme Enterprise Plan' },
      { id: 3, name: 'Beta Corp Free Trial' },
    ]);
  };

  const fetchLinks = async () => {
    try {
      // Mock data
      setLinks([
        {
          id: 1,
          campaignId: 1,
          campaignName: 'Acme SaaS Launch 2025',
          label: 'Blog Post CTA',
          shortCode: 'sarah-blog-1',
          shortUrl: 'https://afl.ink/sarah-blog-1',
          destinationUrl: 'https://acmesaas.com/signup',
          clicks: 1240,
          conversions: 28,
          earnings: 560.00,
          conversionRate: 2.26,
          createdAt: '2024-09-15',
        },
        {
          id: 2,
          campaignId: 1,
          campaignName: 'Acme SaaS Launch 2025',
          label: 'Email Newsletter',
          shortCode: 'sarah-email-1',
          shortUrl: 'https://afl.ink/sarah-email-1',
          destinationUrl: 'https://acmesaas.com/signup',
          clicks: 890,
          conversions: 19,
          earnings: 380.00,
          conversionRate: 2.13,
          createdAt: '2024-09-20',
        },
        {
          id: 3,
          campaignId: 3,
          campaignName: 'Beta Corp Free Trial',
          label: 'YouTube Video Description',
          shortCode: 'sarah-beta-1',
          shortUrl: 'https://afl.ink/sarah-beta-1',
          destinationUrl: 'https://betacorp.com/trial',
          clicks: 650,
          conversions: 12,
          earnings: 180.00,
          conversionRate: 1.85,
          createdAt: '2024-10-01',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching links:', error);
      setLoading(false);
    }
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredLinks = selectedCampaign === 'all'
    ? links
    : links.filter(link => link.campaignId === parseInt(selectedCampaign));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading links...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">My Links</h1>
              <p className="text-gray-600 mt-1">Create and manage your tracking links</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Create Link
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </div>

        {/* Links Grid */}
        <div className="space-y-4">
          {filteredLinks.map((link) => (
            <div key={link.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-6">
                {/* Link Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{link.label}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {link.campaignName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="px-3 py-1 bg-gray-100 text-gray-900 rounded font-mono text-sm">
                        {link.shortUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(link.shortUrl, link.id)}
                        className="p-2 hover:bg-gray-100 rounded transition"
                        title="Copy link"
                      >
                        {copiedLink === link.id ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-gray-600" />
                        )}
                      </button>
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 rounded transition"
                        title="Open link"
                      >
                        <ExternalLink size={18} className="text-gray-600" />
                      </a>
                    </div>
                    <div className="text-sm text-gray-600">
                      Destination: <span className="font-mono">{link.destinationUrl}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created {new Date(link.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded transition">
                      <Edit2 size={18} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded transition">
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Link Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox
                    label="Clicks"
                    value={link.clicks.toLocaleString()}
                    color="text-blue-600"
                  />
                  <StatBox
                    label="Conversions"
                    value={link.conversions}
                    color="text-green-600"
                  />
                  <StatBox
                    label="Conversion Rate"
                    value={`${link.conversionRate}%`}
                    color="text-purple-600"
                  />
                  <StatBox
                    label="Earnings"
                    value={`$${link.earnings.toLocaleString()}`}
                    color="text-green-600"
                  />
                </div>

                {/* View Details Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                    <BarChart2 size={18} />
                    View Detailed Analytics
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLinks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No links yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first tracking link to start earning commissions
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Create Link
            </button>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <CreateLinkModal
          campaigns={campaigns}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchLinks}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CreateLinkModal({ campaigns, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    campaignId: '',
    label: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
  });

  const handleCreate = () => {
    // In production, submit to API
    console.log('Creating link:', formData);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Link</h2>
          <p className="text-gray-600 mt-1">Generate a tracking link for your content</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign *
            </label>
            <select
              value={formData.campaignId}
              onChange={(e) => setFormData({...formData, campaignId: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a campaign</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Label *
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Blog Post CTA, Instagram Bio, Email Signature"
            />
            <p className="text-sm text-gray-600 mt-1">
              This helps you identify where the link is used
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              UTM Parameters (Optional)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add UTM parameters to track the source of your traffic more precisely
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Source
                </label>
                <input
                  type="text"
                  value={formData.utmSource}
                  onChange={(e) => setFormData({...formData, utmSource: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., instagram, blog"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Medium
                </label>
                <input
                  type="text"
                  value={formData.utmMedium}
                  onChange={(e) => setFormData({...formData, utmMedium: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., post, story, bio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Campaign
                </label>
                <input
                  type="text"
                  value={formData.utmCampaign}
                  onChange={(e) => setFormData({...formData, utmCampaign: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., launch2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Content
                </label>
                <input
                  type="text"
                  value={formData.utmContent}
                  onChange={(e) => setFormData({...formData, utmContent: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., cta-button, header"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleCreate}
              disabled={!formData.campaignId || !formData.label}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Create Link
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}