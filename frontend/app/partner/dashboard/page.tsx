"use client"
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, MousePointerClick, TrendingUp, Link2, Clock, CheckCircle } from 'lucide-react';

export default function PartnerDashboard() {
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    activeCampaigns: 0,
    conversionRate: 0,
  });
  
  const [performanceData, setPerformanceData] = useState([]);
  const [topLinks, setTopLinks] = useState([]);
  const [recentConversions, setRecentConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - in production, fetch from API
      setStats({
        totalClicks: 4750,
        totalConversions: 128,
        totalEarnings: 2560.00,
        pendingEarnings: 680.00,
        activeCampaigns: 3,
        conversionRate: 2.69,
      });
      
      setPerformanceData([
        { date: 'Oct 1', clicks: 520, conversions: 12, earnings: 240 },
        { date: 'Oct 2', clicks: 614, conversions: 15, earnings: 300 },
        { date: 'Oct 3', clicks: 580, conversions: 13, earnings: 260 },
        { date: 'Oct 4', clicks: 695, conversions: 18, earnings: 360 },
        { date: 'Oct 5', clicks: 720, conversions: 16, earnings: 320 },
        { date: 'Oct 6', clicks: 640, conversions: 14, earnings: 280 },
        { date: 'Oct 7', clicks: 690, conversions: 17, earnings: 340 },
      ]);
      
      setTopLinks([
        { label: 'Blog Post CTA', clicks: 1240, conversions: 28, earnings: 560, url: 'afl.ink/sarah-blog-1' },
        { label: 'Email Newsletter', clicks: 890, conversions: 19, earnings: 380, url: 'afl.ink/sarah-email-1' },
        { label: 'Social Media Bio', clicks: 650, conversions: 12, earnings: 240, url: 'afl.ink/sarah-social-1' },
      ]);
      
      setRecentConversions([
        { campaign: 'Acme SaaS Launch', amount: 40.00, status: 'approved', date: '2 hours ago' },
        { campaign: 'Acme SaaS Launch', amount: 30.00, status: 'approved', date: '5 hours ago' },
        { campaign: 'Beta Corp Trial', amount: 15.00, status: 'pending', date: '1 day ago' },
        { campaign: 'Acme SaaS Launch', amount: 50.00, status: 'approved', date: '2 days ago' },
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
              <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
              <p className="text-gray-600 mt-1">Track your performance and earnings</p>
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
        {/* Earnings Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={24} />
                <span className="text-blue-100">Total Earnings</span>
              </div>
              <div className="text-4xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
              <div className="text-blue-100 mt-1">All time</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={24} />
                <span className="text-blue-100">Pending</span>
              </div>
              <div className="text-4xl font-bold">${stats.pendingEarnings.toLocaleString()}</div>
              <div className="text-blue-100 mt-1">Awaiting approval</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={24} />
                <span className="text-blue-100">Conversion Rate</span>
              </div>
              <div className="text-4xl font-bold">{stats.conversionRate}%</div>
              <div className="text-blue-100 mt-1">+0.3% from last period</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<MousePointerClick className="text-blue-600" />}
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            change="+12%"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" />}
            label="Conversions"
            value={stats.totalConversions}
            change="+8%"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<Link2 className="text-purple-600" />}
            label="Active Campaigns"
            value={stats.activeCampaigns}
            change="+1"
            bgColor="bg-purple-50"
          />
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
              <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} name="Earnings ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Top Performing Links</h2>
              <a href="/partner/links" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {topLinks.map((link, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{link.label}</div>
                      <div className="text-sm text-gray-500 font-mono">{link.url}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${link.earnings}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{link.clicks.toLocaleString()} clicks</span>
                    <span>•</span>
                    <span>{link.conversions} conversions</span>
                    <span>•</span>
                    <span className="text-green-600 font-medium">
                      {((link.conversions / link.clicks) * 100).toFixed(2)}% CR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Conversions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Conversions</h2>
              <a href="/partner/earnings" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {recentConversions.map((conversion, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">{conversion.campaign}</div>
                    <div className="text-sm text-gray-600">{conversion.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${conversion.amount.toFixed(2)}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conversion.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {conversion.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton
              icon={<Link2 />}
              label="Generate New Link"
              description="Create a new tracking link"
              onClick={() => window.location.href = '/partner/links'}
            />
            <ActionButton
              icon={<TrendingUp />}
              label="Browse Campaigns"
              description="Find new opportunities"
              onClick={() => window.location.href = '/partner/campaigns'}
            />
            <ActionButton
              icon={<DollarSign />}
              label="View Earnings"
              description="Check your commission details"
              onClick={() => window.location.href = '/partner/earnings'}
            />
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

function ActionButton({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
    >
      <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </button>
  );
}

function PerformanceCard({ label, value, change }) {
    return (<div>
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
              <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} name="Earnings ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Top Performing Links</h2>
              <a href="/partner/links" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {topLinks.map((link, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{link.label}</div>
                      <div className="text-sm text-gray-500 font-mono">{link.url}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${link.earnings}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{link.clicks.toLocaleString()} clicks</span>
                    <span>•</span>
                    <span>{link.conversions} conversions</span>
                    <span>•</span>
                    <span className="text-green-600 font-medium">
                      {((link.conversions / link.clicks) * 100).toFixed(2)}% CR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Conversions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Conversions</h2>
              <a href="/partner/earnings" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              {recentConversions.map((conversion, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">{conversion.campaign}</div>
                    <div className="text-sm text-gray-600">{conversion.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${conversion.amount.toFixed(2)}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conversion.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {conversion.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton
              icon={<LinkIcon />}
              label="Generate New Link"
              description="Create a new tracking link"
              onClick={() => window.location.href = '/partner/links'}
            />
            <ActionButton
              icon={<TrendingUp />}
              label="Browse Campaigns"
              description="Find new opportunities"
              onClick={() => window.location.href = '/partner/campaigns'}
            />
            <ActionButton
              icon={<DollarSign />}
              label="View Earnings"
              description="Check your commission details"
              onClick={() => window.location.href = '/partner/earnings'}
            />
          </div>
        </div>
      </div>
  );
}