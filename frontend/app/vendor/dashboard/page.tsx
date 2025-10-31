"use client"
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MousePointerClick, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { useVendorDashboard, useVendorCampaigns, useAvailablePartners } from '@/hooks/use-api';
import { ErrorBoundary } from '@/components/loading-skeleton';

export default function VendorDashboard() {
  // Filter state - set default dates to last 7 days
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6); // 7 days including today
    return start.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [utmSource, setUtmSource] = useState<string>('');
  const [utmMedium, setUtmMedium] = useState<string>('');
  const [utmCampaign, setUtmCampaign] = useState<string>('');

  // Fetch campaigns for dropdown
  const { data: campaignsResponse } = useVendorCampaigns(undefined, { page: 1, limit: 100 });
  const campaigns = campaignsResponse?.data || [];

  // Fetch available partners for selected campaign
  const { data: partnersResponse } = useAvailablePartners(campaignId || undefined);
  const availablePartners = partnersResponse?.partners || [];

  // Fetch dashboard data with filters
  const { data: dashboardData, loading, error } = useVendorDashboard({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    campaign_id: campaignId || undefined,
    partner_id: selectedPartnerId || undefined,
    utm_source: utmSource || undefined,
    utm_medium: utmMedium || undefined,
    utm_campaign: utmCampaign || undefined,
  });

  // Handle partner name to ID mapping
  useEffect(() => {
    if (selectedPartnerName) {
      const partner = availablePartners.find(p => p.name === selectedPartnerName);
      if (partner) {
        setSelectedPartnerId(partner.partner_id);
      }
    } else {
      setSelectedPartnerId(null);
    }
  }, [selectedPartnerName, availablePartners]);

  if (error) {
    return <ErrorBoundary error={error.message} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Extract data from API response
  const stats = dashboardData || {
    total_campaigns: 0,
    total_partners: 0,
    total_clicks: 0,
    total_conversions: 0,
    total_revenue: 0,
    total_payout: 0,
    pending_payouts: 0,
  };

  // Calculate conversion rate
  const conversionRate = stats.total_clicks > 0
    ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(2)
    : '0.00';

  // Generate complete date range with all dates, filling in missing data with zeros
  const performanceData = (() => {
    const rawData = dashboardData?.performance_data || [];

    // Create a map of existing data for quick lookup
    const dataMap = new Map();
    rawData.forEach((d) => {
      const dateKey = d.date;
      dataMap.set(dateKey, {
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        clicks: d.clicks,
        conversions: d.conversions,
        revenue: d.revenue,
      });
    });

    // Generate all dates in the range
    const allDates = [];

    // Parse dates properly to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      const existingData = dataMap.get(dateKey);

      if (existingData) {
        allDates.push(existingData);
      } else {
        allDates.push({
          date: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          clicks: 0,
          conversions: 0,
          revenue: 0,
        });
      }
    }

    return allDates;
  })();

  const topPartners = dashboardData?.top_partners || [];

  const recentActivity = [
    { type: 'conversion', partner: 'Lisa Influencer', amount: 250, time: '5 minutes ago' },
    { type: 'application', partner: 'New Partner', campaign: 'Acme SaaS Launch', time: '1 hour ago' },
    { type: 'conversion', partner: 'Sarah Tech Blogger', amount: 150, time: '2 hours ago' },
    { type: 'payout', partner: 'Mike Marketing', amount: 720, time: '3 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><TrendingUp size={32} className="text-primary" /> Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of your partner program performance</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Campaign</label>
              <select
                value={campaignId || ''}
                onChange={(e) => {
                  setCampaignId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedPartnerName('');
                }}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Campaigns</option>
                {dashboardData?.available_campaigns?.map((campaign: any) => (
                  <option key={campaign.campaign_id} value={campaign.campaign_id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Partner</label>
              <select
                value={selectedPartnerName}
                onChange={(e) => setSelectedPartnerName(e.target.value)}
                disabled={availablePartners.length === 0}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary disabled:bg-muted"
              >
                <option value="">All Partners</option>
                {availablePartners.map((partner) => (
                  <option key={partner.partner_id} value={partner.name}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Source */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">UTM Source</label>
              <select
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sources</option>
                {dashboardData?.available_utm_sources?.map((source: string) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Medium */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">UTM Medium</label>
              <select
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Mediums</option>
                {dashboardData?.available_utm_mediums?.map((medium: string) => (
                  <option key={medium} value={medium}>
                    {medium}
                  </option>
                ))}
              </select>
            </div>

            {/* UTM Campaign */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">UTM Campaign</label>
              <select
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Campaigns</option>
                {dashboardData?.available_utm_campaigns?.map((campaign: string) => (
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
                  setStartDate('');
                  setEndDate('');
                  setCampaignId(null);
                  setSelectedPartnerName('');
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="text-primary" />}
            label={<Link href="/vendor/campaigns" className="text-purple-500 hover:underline">Total Campaigns</Link>}
            value={stats.total_campaigns || 0}
            change="+2"
            bgColor="bg-primary/10"
          />
          <StatCard
            icon={<Users className="text-secondary" />}
            label="Active Partners"
            value={stats.total_partners || 0}
            change="+5"
            bgColor="bg-secondary"
          />
          <StatCard
            icon={<MousePointerClick className="text-primary" />}
            label="Total Clicks"
            value={(stats.total_clicks || 0).toLocaleString()}
            change="+12%"
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={<TrendingUp className="text-orange-600" />}
            label="Conversions"
            value={stats.total_conversions || 0}
            change="+8%"
            bgColor="bg-orange-50"
          />
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-background rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Revenue</span>
              <DollarSign className="text-secondary" size={20} />
            </div>
            <div className="text-3xl font-bold text-foreground">
              ${(stats.total_revenue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-secondary mt-1">+15% from last period</div>
          </div>

          <div className="bg-background rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Payouts</span>
              <DollarSign className="text-primary" size={20} />
            </div>
            <div className="text-3xl font-bold text-foreground">
              ${(stats.total_payout || 0).toLocaleString()}
            </div>
            <div className="text-sm text-primary mt-1">{stats.pending_payouts || 0} pending</div>
          </div>

          <div className="bg-background rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Conversion Rate</span>
              <TrendingUp className="text-primary" size={20} />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {conversionRate}%
            </div>
            <div className="text-sm text-primary mt-1">+0.3% from last period</div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-background rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">Performance Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} name="Clicks" />
              <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Partners */}
          <div className="bg-background rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Top Performing Partners</h2>
              <a href="/vendor/campaigns" className="text-primary hover:text-primary text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {topPartners.map((partner, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <div className="font-semibold text-foreground">{partner.name || partner.partner_name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">
                      {(partner.total_clicks || partner.clicks || 0).toLocaleString()} clicks • {(partner.total_conversions || partner.conversions || 0)} conversions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground">${(partner.total_revenue || partner.revenue || 0).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">${(partner.total_commission || partner.commission || 0).toLocaleString()} commission</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-background rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-foreground mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'conversion' ? 'bg-green-100' :
                    activity.type === 'application' ? 'bg-purple-100' :
                    'bg-purple-100'
                  }`}>
                    {activity.type === 'conversion' && <DollarSign size={16} className="text-secondary" />}
                    {activity.type === 'application' && <Users size={16} className="text-primary" />}
                    {activity.type === 'payout' && <TrendingUp size={16} className="text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-foreground">
                      {activity.type === 'conversion' && (
                        <>
                          <span className="font-semibold">{activity.partner}</span> made a sale
                          {activity.amount && <span className="text-secondary font-semibold"> ${activity.amount}</span>}
                        </>
                      )}
                      {activity.type === 'application' && (
                        <>
                          <span className="font-semibold">{activity.partner}</span> applied to{' '}
                          <span className="font-semibold">{activity.campaign}</span>
                        </>
                      )}
                      {activity.type === 'payout' && (
                        <>
                          Paid <span className="font-semibold">${activity.amount}</span> to{' '}
                          <span className="font-semibold">{activity.partner}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, bgColor }) {
  return (
    <div className="bg-background rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <span className="text-sm text-secondary font-medium">{change}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}