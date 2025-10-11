"use client"
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, MousePointerClick, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import VendorLayout from '@/app/vendor/layout';

type PerformanceData = {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
};

type TopPartnerData = {
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
};

type RecentActivity = 
  | {
      type: 'conversion' | 'payout';
      partner: string;
      amount: number;
      time: string;
    }
  | {
      type: 'application';
      partner: string;
      campaign: string;
      time: string;
    };
export default function VendorDashboard() {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activePartners: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalCommission: 0,
    conversionRate: 0,
  });
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartnerData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In production, fetch from API
      // const response = await fetch('/api/vendors/1/dashboard');
      // const data = await response.json();
      
      // Mock data for demonstration
      setStats({
        totalCampaigns: 3,
        activePartners: 12,
        totalClicks: 15420,
        totalConversions: 342,
        totalRevenue: 68400.00,
        totalCommission: 13680.00,
        conversionRate: 2.22,
      });
      
      setPerformanceData([
        { date: 'Oct 1', clicks: 520, conversions: 12, revenue: 2400 },
        { date: 'Oct 2', clicks: 614, conversions: 15, revenue: 3000 },
        { date: 'Oct 3', clicks: 580, conversions: 13, revenue: 2600 },
        { date: 'Oct 4', clicks: 695, conversions: 18, revenue: 3600 },
        { date: 'Oct 5', clicks: 720, conversions: 16, revenue: 3200 },
        { date: 'Oct 6', clicks: 640, conversions: 14, revenue: 2800 },
        { date: 'Oct 7', clicks: 690, conversions: 17, revenue: 3400 },
      ]);
      
      setTopPartners([
        { name: 'Lisa Influencer', clicks: 2340, conversions: 68, revenue: 13600, commission: 2720 },
        { name: 'Sarah Tech Blogger', clicks: 1520, conversions: 42, revenue: 8400, commission: 1680 },
        { name: 'Mike Marketing', clicks: 890, conversions: 18, revenue: 3600, commission: 720 },
      ]);
      
      setRecentActivity([
        { type: 'conversion', partner: 'Lisa Influencer', amount: 250, time: '5 minutes ago' },
        { type: 'application', partner: 'New Partner', campaign: 'Acme SaaS Launch', time: '1 hour ago' },
        { type: 'conversion', partner: 'Sarah Tech Blogger', amount: 150, time: '2 hours ago' },
        { type: 'payout', partner: 'Mike Marketing', amount: 720, time: '3 hours ago' },
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

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
            value={stats.totalCampaigns}
            change="+2"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<Users className="text-green-600" />}
            label="Active Partners"
            value={stats.activePartners}
            change="+5"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<MousePointerClick className="text-purple-600" />}
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            change="+12%"
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={<TrendingUp className="text-orange-600" />}
            label="Conversions"
            value={stats.totalConversions}
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
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-1">+15% from last period</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Commission Paid</span>
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalCommission.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 mt-1">20% of revenue</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Conversion Rate</span>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.conversionRate}%
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
                    <div className="font-semibold text-gray-900">{partner.name}</div>
                    <div className="text-sm text-gray-600">
                      {partner.clicks.toLocaleString()} clicks • {partner.conversions} conversions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${partner.revenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">${partner.commission} commission</div>
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