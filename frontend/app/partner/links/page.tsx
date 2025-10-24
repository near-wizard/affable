"use client"
import { useState, useEffect } from 'react';
import { Plus, Copy, ExternalLink, BarChart2, Trash2, Check, AlertCircle, Loader } from 'lucide-react';
import { useCurrentPartner, usePartnerLinks, usePartnerCampaigns, useCreateLink } from '@/hooks/use-api';

interface LinkFormData {
  campaignPartnerId: number;
  linkLabel: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  };
}

export default function PartnerLinks() {
  const { data: currentPartner, loading: partnerLoading } = useCurrentPartner();
  const partnerId = currentPartner?.partner_id?.toString();
  const { data: campaignsData, loading: campaignsLoading } = usePartnerCampaigns(
    partnerId
  );
  const { data: linksData, loading: linksLoading } = usePartnerLinks(
    partnerId
  );
  const { mutate: createLink, loading: creatingLink, error: createError } = useCreateLink();

  // Extract campaigns from response
  const enrolledCampaigns = campaignsData?.data || [];
  // Extract links from response (handle both paginated and non-paginated responses)
  const links = linksData?.data || linksData || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    campaignPartnerId: 0,
    linkLabel: '',
    utmParams: {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
    },
  });
  const [formError, setFormError] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleOpenModal = () => {
    setShowCreateModal(true);
    setFormError('');
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormError('');
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validate required fields
    if (!formData.campaignPartnerId) {
      setFormError('Please select a campaign');
      return;
    }

    if (!formData.linkLabel.trim()) {
      setFormError('Please enter a link label');
      return;
    }

    try {
      const payload = {
        campaign_partner_id: formData.campaignPartnerId,
        link_label: formData.linkLabel,
        custom_params: {},  // Empty by default; can be extended in future
        utm_params: Object.fromEntries(
          Object.entries(formData.utmParams || {}).filter(([, v]) => v)
        ) || undefined,
      };

      await createLink(payload);
      setShowCreateModal(false);
      setFormData({
        campaignPartnerId: 0,
        linkLabel: '',
        utmParams: {
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          utm_content: '',
        },
      });
      // The hook will automatically refetch links
    } catch (error) {
      console.error('Failed to create link:', error);
      if (error instanceof Error) {
        setFormError(error.message || 'Failed to create link');
      } else {
        setFormError('Failed to create link. Please try again.');
      }
    }
  };

  // Filter links by selected campaign
  const filteredLinks = selectedCampaign === 'all'
    ? links
    : links?.filter(link => link.campaign_partner_id === parseInt(selectedCampaign));

  if (partnerLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentPartner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-600 mb-4" />
          <p className="text-gray-800 font-semibold">Unable to load partner data</p>
          <p className="text-gray-600 mt-2">Please ensure you are logged in as a partner</p>
        </div>
      </div>
    );
  }

  // Filter campaigns to only approved ones (where partner can create links)
  const approvedCampaigns = enrolledCampaigns?.filter(
    (camp: any) => camp.status === 'approved'
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Affiliate Links</h1>
            <p className="text-gray-600 mt-2">
              Create and manage your tracking links. One link per piece of content helps you understand what works best.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Create Link
          </button>
        </div>

        {/* Campaign Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Campaign</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg p-2 text-gray-900"
          >
            <option value="all">All Campaigns</option>
            {approvedCampaigns.map((campaign: any) => (
              <option key={campaign.campaign_partner_id} value={campaign.campaign_partner_id}>
                {campaign.name || 'Unnamed Campaign'}
              </option>
            ))}
          </select>
        </div>

        {/* Links List */}
        {linksLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading links...</p>
          </div>
        ) : filteredLinks && filteredLinks.length > 0 ? (
          <div className="grid gap-4">
            {filteredLinks.map((link: any) => (
              <div key={link.partner_link_id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{link.link_label}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Campaign: {link.campaign_partner?.campaign_version?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(link.tracking_url, link.partner_link_id)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Copy tracking URL"
                    >
                      {copiedLink === link.partner_link_id ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <Copy size={20} className="text-gray-600" />
                      )}
                    </button>
                    <a
                      href={link.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Test link"
                    >
                      <ExternalLink size={20} className="text-gray-600" />
                    </a>
                  </div>
                </div>

                {/* Link URLs */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm">
                  <div className="mb-3">
                    <p className="text-gray-600 text-xs mb-1">Tracking URL:</p>
                    <p className="text-gray-900 break-all">{link.tracking_url}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Destination:</p>
                    <p className="text-gray-900 break-all text-xs">{link.full_url}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Clicks</p>
                    <p className="text-2xl font-bold text-gray-900">{link.click_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversions</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conv. Rate</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Created: {new Date(link.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No links yet. Create your first link to start tracking!</p>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Link</h2>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded flex items-start gap-2">
                <AlertCircle size={20} className="mt-0.5" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{createError.message}</p>
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateLink} className="space-y-4">
              {/* Campaign Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign *
                </label>
                <select
                  value={formData.campaignPartnerId}
                  onChange={(e) =>
                    setFormData({ ...formData, campaignPartnerId: parseInt(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
                  disabled={creatingLink}
                >
                  <option value={0}>Select a campaign...</option>
                  {approvedCampaigns.map((campaign: any) => (
                    <option
                      key={campaign.campaign_partner_id}
                      value={campaign.campaign_partner_id}
                    >
                      {campaign.name || 'Unnamed Campaign'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only approved campaigns are available
                </p>
              </div>

              {/* Link Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Label (e.g., "Blog Post Title") *
                </label>
                <input
                  type="text"
                  value={formData.linkLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, linkLabel: e.target.value })
                  }
                  placeholder="e.g., Blog Post CTA, YouTube Description"
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
                  disabled={creatingLink}
                  maxLength={255}
                />
              </div>

              {/* UTM Parameters */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">UTM Parameters (Optional)</p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="UTM Source (e.g., blog, twitter)"
                    value={formData.utmParams?.utm_source || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        utmParams: {
                          ...formData.utmParams,
                          utm_source: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
                    disabled={creatingLink}
                  />

                  <input
                    type="text"
                    placeholder="UTM Medium (e.g., post, tweet)"
                    value={formData.utmParams?.utm_medium || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        utmParams: {
                          ...formData.utmParams,
                          utm_medium: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
                    disabled={creatingLink}
                  />

                  <input
                    type="text"
                    placeholder="UTM Campaign"
                    value={formData.utmParams?.utm_campaign || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        utmParams: {
                          ...formData.utmParams,
                          utm_campaign: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
                    disabled={creatingLink}
                  />

                  <input
                    type="text"
                    placeholder="UTM Content"
                    value={formData.utmParams?.utm_content || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        utmParams: {
                          ...formData.utmParams,
                          utm_content: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
                    disabled={creatingLink}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={creatingLink}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={creatingLink}
                >
                  {creatingLink && <Loader size={18} className="animate-spin" />}
                  {creatingLink ? 'Creating...' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
