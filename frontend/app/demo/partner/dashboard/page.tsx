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
} from 'recharts';
import {
  DollarSign,
  MousePointerClick,
  TrendingUp,
  Link2,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function DemoPartnerDashboard() {
  const { partnerData } = useDemoContext();
  const [selectedUTMSource, setSelectedUTMSource] = useState<string>('');
  const [selectedUTMmedium, setSelectedUTMmedium] = useState<string>('');
  const [selectedUTMCampaign, setSelectedUTMCampaign] = useState<string>('');

  // For demo, filtering doesn't change data but maintains state
  const filteredData = useMemo(() => {
    return partnerData.performanceData;
  }, [partnerData.performanceData]);

  const stats = {
    total_clicks: partnerData.totalClicks,
    total_conversions: partnerData.totalConversions,
    total_earnings: partnerData.totalEarnings,
    pending_earnings: partnerData.pendingEarnings,
    active_campaigns: partnerData.activeCampaigns,
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Earnings Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={24} />
                <span className="text-blue-100">Total Earnings</span>
              </div>
              <div className="text-4xl font-bold">
                ${(stats.total_earnings || 0).toFixed(2)}
              </div>
              <div className="text-blue-100 mt-1">All time</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={24} />
                <span className="text-blue-100">Pending</span>
              </div>
              <div className="text-4xl font-bold">
                ${(stats.pending_earnings || 0).toFixed(2)}
              </div>
              <div className="text-blue-100 mt-1">Awaiting approval</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={24} />
                <span className="text-blue-100">Conversion Rate</span>
              </div>
              <div className="text-4xl font-bold">{partnerData.conversionRate}%</div>
              <div className="text-blue-100 mt-1">of clicks converting</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<MousePointerClick className="text-primary" />}
            label="Total Clicks"
            value={(stats.total_clicks || 0).toLocaleString()}
            bgColor="bg-primary/10"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" />}
            label="Conversions"
            value={(stats.total_conversions || 0).toLocaleString()}
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<TrendingUp className="text-purple-600" />}
            label="Active Campaigns"
            value={stats.active_campaigns}
            bgColor="bg-purple-50"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Source
              </label>
              <select
                value={selectedUTMSource}
                onChange={(e) => setSelectedUTMSource(e.target.value)}
                className="w-full border border-border rounded-lg p-2 text-foreground"
              >
                <option value="">All Sources</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Medium
              </label>
              <select
                value={selectedUTMmedium}
                onChange={(e) => setSelectedUTMmedium(e.target.value)}
                className="w-full border border-border rounded-lg p-2 text-foreground"
              >
                <option value="">All Mediums</option>
                <option value="cpc">CPC</option>
                <option value="social">Social</option>
                <option value="organic">Organic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                UTM Campaign
              </label>
              <select
                value={selectedUTMCampaign}
                onChange={(e) => setSelectedUTMCampaign(e.target.value)}
                className="w-full border border-border rounded-lg p-2 text-foreground"
              >
                <option value="">All Campaigns</option>
                <option value="summer_sale">Summer Sale</option>
                <option value="black_friday">Black Friday</option>
                <option value="product_launch">Product Launch</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: Filters are preserved but data is static in demo mode
          </p>
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
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Clicks"
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                strokeWidth={2}
                name="Conversions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Link2 size={20} />
              Top Performing Links
            </h3>
            <div className="space-y-4">
              {partnerData.topLinks.map((link) => (
                <div
                  key={link.url}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{link.label}</p>
                    <p className="text-sm text-muted-foreground">{link.url}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {link.clicks.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">clicks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Conversions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              Recent Conversions
            </h3>
            <div className="space-y-3">
              {partnerData.recentConversions.map((conv, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{conv.campaign}</p>
                    <p className="text-sm text-muted-foreground">{conv.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ${conv.amount.toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        conv.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {conv.status}
                    </span>
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

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
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
