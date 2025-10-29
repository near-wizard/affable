"use client";
import { useState, useMemo, useEffect } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import {
	DollarSign,
	MousePointerClick,
	TrendingUp,
	Link2,
	Clock,
	CheckCircle,
	Filter,
	X,
} from "lucide-react";
import {
	usePartnerDashboard,
	usePartnerConversions,
	usePartnerLinks,
	useCurrentPartner,
	usePartnerAnalytics,
	useAsync,
} from "@/hooks/use-api";
import { apiClient, getAuthToken } from "@/lib/api-client";

export default function PartnerDashboard() {
	const { data: currentPartner } = useCurrentPartner();
	const partnerId = currentPartner?.partner_id?.toString();

	// Use /me endpoints for current user's data
	const { data: dashboardData, loading: dashboardLoading } = useAsync(
		() => apiClient.currentUser.getPartnerDashboard(getAuthToken() || undefined),
		{ enabled: true }
	);
	const { data: conversionsData } = usePartnerConversions(partnerId, {
		limit: 5,
	});
	const { data: linksData } = usePartnerLinks(partnerId, { limit: 5 });

	// Calculate default dates once at component initialization
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
	const [selectedUTMSource, setSelectedUTMSource] = useState<string>("");
	const [selectedUTMmedium, setSelectedUTMmedium] = useState<string>("");
	const [selectedUTMCampaign, setSelectedUTMCampaign] = useState<string>("");

	// Track loaded date range to decide if we need to fetch new data
	const [loadedStartDate, setLoadedStartDate] = useState<string>(() => {
		const today = new Date();
		const start = new Date(today);
		start.setDate(start.getDate() - 6);
		return start.toISOString().split("T")[0];
	});
	const [loadedEndDate, setLoadedEndDate] = useState<string>(() => {
		const today = new Date();
		return today.toISOString().split("T")[0];
	});

	// Determine if we need to fetch new data
	// Fetch if user selected dates that extend beyond currently loaded range
	const displayStartDate = startDate;
	const displayEndDate = endDate;

	const needsNewFetch = useMemo(() => {
		// If requested range extends beyond loaded range, fetch new data
		if (displayStartDate < loadedStartDate || displayEndDate > loadedEndDate)
			return true;
		return false;
	}, [displayStartDate, displayEndDate, loadedStartDate, loadedEndDate]);

	// Memoize analytics params - always include dates, params object itself is memoized
	const analyticsParams = useMemo(() => {
		return {
			start_date: displayStartDate,
			end_date: displayEndDate,
			utm_source: selectedUTMSource || undefined,
			utm_medium: selectedUTMmedium || undefined,
			utm_campaign: selectedUTMCampaign || undefined,
		};
	}, [
		displayStartDate,
		displayEndDate,
		selectedUTMSource,
		selectedUTMmedium,
		selectedUTMCampaign,
	]);

	// Fetch analytics with current params
	const {
		data: analyticsData,
		loading: analyticsLoading,
		error: analyticsError,
	} = usePartnerAnalytics(partnerId, analyticsParams);

	// Update loaded date range when dates change
	useEffect(() => {
		if (displayStartDate !== loadedStartDate || displayEndDate !== loadedEndDate) {
			setLoadedStartDate(displayStartDate);
			setLoadedEndDate(displayEndDate);
		}
	}, [displayStartDate, displayEndDate, loadedStartDate, loadedEndDate]);

	// Use analytics data directly - filtering is done server-side
	const filteredAnalyticsData = analyticsData;

	const loading = dashboardLoading;

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

	const stats = dashboardData?.stats || {
		total_clicks: 0,
		total_conversions: 0,
		total_earnings: 0,
		pending_earnings: 0,
		active_campaigns: 0,
	};

	const conversionRate =
		stats.total_clicks > 0
			? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(2)
			: 0;

	// Generate complete date range with all dates, filling in missing data with zeros
	const performanceData = (() => {
		const rawData = filteredAnalyticsData?.data || [];

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
			});
		});

		// Generate all dates in the range
		const allDates = [];

		// Parse dates properly to avoid timezone issues
		const [startYear, startMonth, startDay] = displayStartDate.split("-").map(Number);
		const [endYear, endMonth, endDay] = displayEndDate.split("-").map(Number);

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
				});
			}
		}

		return allDates;
	})();

	const topLinks = (linksData?.data || [])
		.sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
		.slice(0, 3)
		.map((link) => ({
			label: link.link_label || "Unnamed Link",
			clicks: link.click_count || 0,
			url: link.short_code,
		}));

	const recentConversions = (conversionsData?.data || [])
		.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
		.slice(0, 4)
		.map((conv) => ({
			campaign: `Campaign #${conv.campaign_id}`,
			amount: conv.commission_amount || 0,
			status: conv.status,
			date: new Date(conv.occurred_at).toLocaleDateString(),
		}));

	// Calculate active campaigns from dashboard data (campaigns with "approved" status)
	const activeCampaignsCount = (dashboardData?.recent_campaigns || []).filter(
		(campaign) => campaign.status === "approved"
	).length;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Partner Dashboard
							</h1>
							<p className="text-gray-600 mt-1">
								Track your performance and earnings
							</p>
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
							<div className="text-4xl font-bold">{conversionRate}%</div>
							<div className="text-blue-100 mt-1">of clicks converting</div>
						</div>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<StatCard
						icon={<MousePointerClick className="text-blue-600" />}
						label="Total Clicks"
						value={(stats.total_clicks || 0).toLocaleString()}
						bgColor="bg-blue-50"
					/>
					<StatCard
						icon={<CheckCircle className="text-green-600" />}
						label="Conversions"
						value={(stats.total_conversions || 0).toLocaleString()}
						bgColor="bg-green-50"
					/>
					<StatCard
						icon={<Link2 className="text-purple-600" />}
						label="Active Campaigns"
						value={activeCampaignsCount.toLocaleString()}
						bgColor="bg-purple-50"
					/>
				</div>

				{/* Analytics Filters */}
				<div className="bg-white rounded-lg shadow p-6 mb-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
							<Filter size={20} />
							Analytics Filters
						</h2>
						{(startDate ||
							endDate ||
							selectedUTMSource ||
							selectedUTMmedium ||
							selectedUTMCampaign) && (
							<button
								onClick={() => {
									setStartDate("");
									setEndDate("");
									setSelectedUTMSource("");
									setSelectedUTMmedium("");
									setSelectedUTMCampaign("");
								}}
								className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
							>
								<X size={16} />
								Clear Filters
							</button>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						{/* Date Range */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Start Date
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								End Date
							</label>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							/>
						</div>

						{/* UTM Filters */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								UTM Source
							</label>
							<select
								value={selectedUTMSource}
								onChange={(e) => setSelectedUTMSource(e.target.value)}
								className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							>
								<option value="">All Sources</option>
								{analyticsData?.utm_sources?.map((source) => (
									<option key={source} value={source}>
										{source || "(none)"}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								UTM Medium
							</label>
							<select
								value={selectedUTMmedium}
								onChange={(e) => setSelectedUTMmedium(e.target.value)}
								className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							>
								<option value="">All Mediums</option>
								{analyticsData?.utm_mediums?.map((medium) => (
									<option key={medium} value={medium}>
										{medium || "(none)"}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								UTM Campaign
							</label>
							<select
								value={selectedUTMCampaign}
								onChange={(e) => setSelectedUTMCampaign(e.target.value)}
								className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							>
								<option value="">All Campaigns</option>
								{analyticsData?.utm_campaigns?.map((campaign) => (
									<option key={campaign} value={campaign}>
										{campaign || "(none)"}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Performance Chart */}
				<div className="bg-white rounded-lg shadow p-6 mb-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">
							Performance Overview
						</h2>
						{analyticsLoading && (
							<div className="text-sm text-gray-500 flex items-center gap-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
								Loading...
							</div>
						)}
					</div>
					{analyticsError ? (
						<div className="flex items-center justify-center h-64 bg-red-50 rounded text-red-700">
							<div className="text-center">
								<p className="font-semibold mb-2">Error loading analytics</p>
								<p className="text-sm">{analyticsError.message}</p>
							</div>
						</div>
					) : analyticsLoading && !performanceData.length ? (
						<div className="flex items-center justify-center h-64 text-gray-500">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
								<p>Loading analytics data...</p>
							</div>
						</div>
					) : performanceData.length > 0 ? (
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={performanceData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" />
								<YAxis yAxisId="left" />
								<YAxis yAxisId="right" orientation="right" />
								<Tooltip />
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
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="text-center py-12 text-gray-500">
							<p>
								No click data available for the selected date range and filters.
							</p>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Top Performing Links */}
					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-gray-900">
								Top Performing Links
							</h2>
							<a
								href="/partner/links"
								className="text-blue-600 hover:text-blue-700 text-sm font-medium"
							>
								View All →
							</a>
						</div>
						<div className="space-y-4">
							{topLinks.length > 0 ? (
								topLinks.map((link, index) => (
									<div key={index} className="p-4 bg-gray-50 rounded-lg">
										<div className="flex items-start justify-between mb-2">
											<div>
												<div className="font-semibold text-gray-900">
													{link.label}
												</div>
												<div className="text-sm text-gray-500 font-mono">
													{link.url}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4 text-sm text-gray-600">
											<span>{link.clicks.toLocaleString()} clicks</span>
										</div>
									</div>
								))
							) : (
								<div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
									No links created yet.{" "}
									<a href="/partner/links" className="text-blue-600">
										Create one now
									</a>
								</div>
							)}
						</div>
					</div>

					{/* Recent Conversions */}
					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-gray-900">
								Recent Conversions
							</h2>
							<a
								href="/partner/earnings"
								className="text-blue-600 hover:text-blue-700 text-sm font-medium"
							>
								View All →
							</a>
						</div>
						<div className="space-y-4">
							{recentConversions.length > 0 ? (
								recentConversions.map((conversion, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
									>
										<div>
											<div className="font-semibold text-gray-900">
												{conversion.campaign}
											</div>
											<div className="text-sm text-gray-600">
												{conversion.date}
											</div>
										</div>
										<div className="text-right">
											<div className="font-bold text-gray-900">
												${conversion.amount.toFixed(2)}
											</div>
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													conversion.status === "approved"
														? "bg-green-100 text-green-800"
														: "bg-orange-100 text-orange-800"
												}`}
											>
												{conversion.status}
											</span>
										</div>
									</div>
								))
							) : (
								<div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
									No conversions yet.{" "}
									<a href="/partner/campaigns" className="text-blue-600">
										Browse campaigns
									</a>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="mt-8 bg-white rounded-lg shadow p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-4">
						Quick Actions
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<ActionButton
							icon={<Link2 />}
							label="Generate New Link"
							description="Create a new tracking link"
							href="/partner/links"
						/>
						<ActionButton
							icon={<TrendingUp />}
							label="Browse Campaigns"
							description="Find new opportunities"
							href="/partner/campaigns"
						/>
						<ActionButton
							icon={<DollarSign />}
							label="View Earnings"
							description="Check your commission details"
							href="/partner/earnings"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ icon, label, value, bgColor }) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex items-center justify-between mb-4">
				<div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
			</div>
			<div className="text-2xl font-bold text-gray-900">{value}</div>
			<div className="text-sm text-gray-600 mt-1">{label}</div>
		</div>
	);
}

function ActionButton({ icon, label, description, href }) {
	return (
		<a
			href={href}
			className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
		>
			<div className="p-3 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
			<div>
				<div className="font-semibold text-gray-900">{label}</div>
				<div className="text-sm text-gray-600">{description}</div>
			</div>
		</a>
	);
}
