'use client';

import { useDemoContext } from '@/context/demo-context';
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  Activity,
} from 'lucide-react';

export default function DemoVendorDashboard() {
  const { vendorData } = useDemoContext();
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [utmSource, setUtmSource] = useState<string>('');
  const [utmMedium, setUtmMedium] = useState<string>('');
  const [utmCampaign, setUtmCampaign] = useState<string>('');

  // For demo, filtering doesn't change data but maintains state
  const filteredData = useMemo(() => {
    return vendorData.performanceData;
  }, [vendorData.performanceData]);

  const stats = {
    total_campaigns: vendorData.totalCampaigns,
    total_partners: vendorData.totalPartners,
    total_clicks: vendorData.totalClicks,
    total_conversions: vendorData.totalConversions,
    total_revenue: vendorData.totalRevenue,
    total_payout: vendorData.totalPayout,
    pending_payouts: vendorData.pendingPayouts,
  };

  const conversionRate = vendorData.conversionRate;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={32} className="text-primary" /> Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Overview of your partner program performance
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Campaign
              </label>
              <select
                value={campaignId || ''}
                onChange={(e) => {
                  setCampaignId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedPartnerId(null);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Campaigns</option>
                {vendorData.availableCampaigns?.map((campaign) => (
                  <option key={campaign.campaign_id} value={campaign.campaign_id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Partner
              </label>
              <select
                value={selectedPartnerId || ''}
                onChange={(e) => setSelectedPartnerId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Partners</option>
                {vendorData.topPartners?.map((partner) => (
                  <option key={partner.partner_id} value={partner.partner_id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Source */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Source
              </label>
              <select
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                {vendorData.availableUtmSources?.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Medium */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Medium
              </label>
              <select
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Mediums</option>
                {vendorData.availableUtmMediums?.map((medium) => (
                  <option key={medium} value={medium}>
                    {medium}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Campaign */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Campaign
              </label>
              <select
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Campaigns</option>
                {vendorData.availableUtmCampaigns?.map((campaign) => (
                  <option key={campaign} value={campaign}>
                    {campaign}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCampaignId(null);
                  setSelectedPartnerId(null);
                  setUtmSource('');
                  setUtmMedium('');
                  setUtmCampaign('');
                }}
                className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: Filters are preserved but data is static in demo mode
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="text-primary" />}
            label="Total Campaigns"
            value={stats.total_campaigns || 0}
            bgColor="bg-primary/10"
          />
          <StatCard
            icon={<Users className="text-green-600" />}
            label="Total Partners"
            value={stats.total_partners || 0}
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<MousePointerClick className="text-purple-600" />}
            label="Total Clicks"
            value={(stats.total_clicks || 0).toLocaleString()}
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={<DollarSign className="text-red-600" />}
            label="Total Revenue"
            value={`$${(stats.total_revenue || 0).toLocaleString()}`}
            bgColor="bg-red-50"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            label="Total Conversions"
            value={stats.total_conversions || 0}
            subtext="events"
          />
          <MetricCard
            label="Conversion Rate"
            value={conversionRate}
            subtext="%"
          />
          <MetricCard
            label="Pending Payouts"
            value={`$${(stats.pending_payouts || 0).toFixed(2)}`}
            subtext="awaiting approval"
          />
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Performance Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Clicks"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                strokeWidth={2}
                name="Conversions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Revenue ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Partners */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Top Performing Partners
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Partner Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendorData.topPartners?.map((partner) => (
                  <tr key={partner.partner_id} className="hover:bg-muted">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">
                      {partner.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {partner.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {partner.conversions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      ${partner.revenue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string | React.ReactNode;
  value: string | number;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6 shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
    </div>
  );
}
