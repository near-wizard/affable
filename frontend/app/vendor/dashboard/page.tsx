"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MousePointerClick, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { useVendorDashboard } from '@/hooks/use-api';
import { ErrorBoundary } from '@/components/loading-skeleton';

export default function VendorDashboard() {
  const { data: dashboardData, loading, error } = useVendorDashboard();

  if (error) {
    return <ErrorBoundary error={error.message} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Extract data from API response
  // The API returns stats directly in the response, not nested
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
    : 0;

  // Mock performance data and top partners since backend doesn't provide them yet
  const performanceData = [
    { date: 'Oct 1', clicks: 520, conversions: 12, revenue: 2400 },
    { date: 'Oct 2', clicks: 614, conversions: 15, revenue: 3000 },
    { date: 'Oct 3', clicks: 580, conversions: 13, revenue: 2600 },
    { date: 'Oct 4', clicks: 695, conversions: 18, revenue: 3600 },
    { date: 'Oct 5', clicks: 720, conversions: 16, revenue: 3200 },
    { date: 'Oct 6', clicks: 640, conversions: 14, revenue: 2800 },
    { date: 'Oct 7', clicks: 690, conversions: 17, revenue: 3400 },
  ];

  const topPartners = [
    { partner_name: 'Lisa Influencer', total_clicks: 2340, total_conversions: 68, total_revenue: 13600, total_commission: 2720 },
    { partner_name: 'Sarah Tech Blogger', total_clicks: 1520, total_conversions: 42, total_revenue: 8400, total_commission: 1680 },
    { partner_name: 'Mike Marketing', total_clicks: 890, total_conversions: 18, total_revenue: 3600, total_commission: 720 },
  ];

  const recentActivity = [
    { type: 'conversion', partner: 'Lisa Influencer', amount: 250, time: '5 minutes ago' },
    { type: 'application', partner: 'New Partner', campaign: 'Acme SaaS Launch', time: '1 hour ago' },
    { type: 'conversion', partner: 'Sarah Tech Blogger', amount: 150, time: '2 hours ago' },
    { type: 'payout', partner: 'Mike Marketing', amount: 720, time: '3 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"> <TrendingUp size={32} className="text-blue-600" /> Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your partner campaigns</p>
              <p className="text-gray-600 mt-1">Overview of your partner program performance</p>
            </div>
            <div className="flex items-center gap-4">
              <select className="px-4 py-2 border border-gray-300 rounded-lg">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="text-blue-600" />}
            label={<Link href="/vendor/campaigns" className="text-blue-500 hover:underline">Total Campaigns</Link>}
            value={stats.total_campaigns || 0}
            change="+2"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<Users className="text-green-600" />}
            label="Active Partners"
            value={stats.total_partners || 0}
            change="+5"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<MousePointerClick className="text-purple-600" />}
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Revenue</span>
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${(stats.total_revenue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-1">+15% from last period</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Payouts</span>
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${(stats.total_payout || 0).toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 mt-1">{stats.pending_payouts || 0} pending</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Conversion Rate</span>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {conversionRate}%
            </div>
            <div className="text-sm text-purple-600 mt-1">+0.3% from last period</div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Overview</h2>
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Top Performing Partners</h2>
              <a href="/vendor/campaigns" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {topPartners.map((partner, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">{partner.name || partner.partner_name || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">
                      {(partner.total_clicks || partner.clicks || 0).toLocaleString()} clicks • {(partner.total_conversions || partner.conversions || 0)} conversions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${(partner.total_revenue || partner.revenue || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">${(partner.total_commission || partner.commission || 0).toLocaleString()} commission</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'conversion' ? 'bg-green-100' :
                    activity.type === 'application' ? 'bg-blue-100' :
                    'bg-purple-100'
                  }`}>
                    {activity.type === 'conversion' && <DollarSign size={16} className="text-green-600" />}
                    {activity.type === 'application' && <Users size={16} className="text-blue-600" />}
                    {activity.type === 'payout' && <TrendingUp size={16} className="text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">
                      {activity.type === 'conversion' && (
                        <>
                          <span className="font-semibold">{activity.partner}</span> made a sale
                          {activity.amount && <span className="text-green-600 font-semibold"> ${activity.amount}</span>}
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
                    <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <span className="text-sm text-green-600 font-medium">{change}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}