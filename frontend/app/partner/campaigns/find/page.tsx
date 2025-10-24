"use client";

import { useState } from "react";
import {
	Search,
	TrendingUp,
	Users,
	DollarSign,
	ArrowUpRight,
	Zap,
} from "lucide-react";
import { useCampaigns, useApplyCampaign } from "@/hooks/use-api";
import {
	GridSkeleton,
	ErrorBoundary,
	EmptyState,
} from "@/components/loading-skeleton";
import type { Campaign } from "@/types/api";

const categories = [
	"All",
	"SaaS",
	"Analytics",
	"Security",
	"Infrastructure",
	"Marketing",
	"Design",
];

interface CampaignCardProps {
	campaign: Campaign;
}

function CampaignCard({ campaign }: CampaignCardProps) {
	const { mutate: applyCampaign, loading: applyLoading } = useApplyCampaign();
	const [applyError, setApplyError] = useState<string | null>(null);

	const handleApply = async () => {
		try {
			setApplyError(null);
			await applyCampaign(campaign?.campaign_id);
			// Show success - could add a toast notification here
		} catch (error) {
			setApplyError(
				error instanceof Error ? error.message : "Failed to apply to campaign"
			);
		}
	};

	// Format commission display
	const commissionDisplay =
		campaign.commission_type === "percentage"
			? `${campaign.commission_value}%`
			: `$${(campaign.commission_value || 0).toLocaleString()}`;

	return (
		<div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 flex flex-col h-full">
			{/* Header */}
			<div className="mb-4">
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-gray-900 mb-1">
							{campaign.name}
						</h3>
						<p className="text-sm text-gray-600">
							{campaign.vendor_name || "Unknown Vendor"}
						</p>
					</div>
					{campaign.category && (
						<span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
							{campaign.category}
						</span>
					)}
				</div>
				<p className="text-sm text-gray-600 leading-relaxed">
					{campaign.description}
				</p>
			</div>

			{/* Commission Badge */}
			<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-gray-600">Commission</span>
					<span className="text-lg font-bold text-blue-600">
						{commissionDisplay}
					</span>
				</div>
			</div>

			{/* Stats Grid */}
			{(campaign.partner_count !== undefined ||
				campaign.conversion_count !== undefined ||
				campaign.conversion_rate !== undefined) && (
				<div className="grid grid-cols-3 gap-3 mb-6">
					{campaign.partner_count !== undefined && (
						<div className="text-center p-3 bg-gray-50 rounded-lg">
							<div className="text-xs text-gray-600 mb-1">Partners</div>
							<div className="text-lg font-bold text-gray-900">
								{campaign.partner_count.toLocaleString()}
							</div>
						</div>
					)}
					{campaign.conversion_count !== undefined && (
						<div className="text-center p-3 bg-gray-50 rounded-lg">
							<div className="text-xs text-gray-600 mb-1">Conversions</div>
							<div className="text-lg font-bold text-gray-900">
								{campaign.conversion_count.toLocaleString()}
							</div>
						</div>
					)}
					{campaign.conversion_rate !== undefined && (
						<div className="text-center p-3 bg-gray-50 rounded-lg">
							<div className="text-xs text-gray-600 mb-1">Conv. Rate</div>
							<div className="text-lg font-bold text-gray-900">
								{campaign.conversion_rate}%
							</div>
						</div>
					)}
				</div>
			)}

			{/* Conversion Trend */}
			{campaign.total_revenue !== undefined && (
				<div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
					<ArrowUpRight className="h-4 w-4 text-green-600" />
					<span className="text-sm text-gray-700">
						<span className="font-semibold">
							${(campaign.total_revenue / 1000000).toFixed(1)}M
						</span>{" "}
						GMV tracked
					</span>
				</div>
			)}

			{/* Error message */}
			{applyError && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm text-red-700">{applyError}</p>
				</div>
			)}

			{/* CTA - Pushes to bottom with flex-1 spacer */}
			<div className="flex-1" />
			<button
				onClick={handleApply}
				disabled={applyLoading}
				className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
			>
				{applyLoading ? "Applying..." : "View Details & Apply"}
			</button>
		</div>
	);
}

export default function FindCampaignsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [page, setPage] = useState(1);

	// Fetch campaigns from API
	const {
		data: campaignsResponse,
		loading,
		error,
	} = useCampaigns({
		page,
		limit: 12,
		search: searchQuery,
		category: selectedCategory !== "All" ? selectedCategory : undefined,
	});

	// Debug logging
	console.log("Campaigns Response:", campaignsResponse);
	console.log("Loading:", loading);
	console.log("Error:", error);

	const campaigns = campaignsResponse?.campaigns || [];

	const filteredCampaigns = campaigns;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
							<Zap size={32} className="text-blue-600" /> Find Campaigns
						</h1>
						<p className="text-gray-600 mt-1">
							Discover and join the best affiliate programs
						</p>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Error State */}
				{error && <ErrorBoundary error={error.message} />}

				{/* Loading State */}
				{loading && !error ? (
					<GridSkeleton columns={3} items={6} />
				) : (
					<>
						{/* Search and Filter Bar */}
						<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
							<div className="flex-1">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Search campaigns
								</label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
									<input
										type="text"
										placeholder="Search by name, vendor, or keyword..."
										value={searchQuery}
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setPage(1); // Reset to page 1 on search
										}}
										className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>

						{/* Category Filter */}
						<div className="mb-8">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Category
							</label>
							<div className="flex flex-wrap gap-2">
								{categories.map((category) => (
									<button
										key={category}
										onClick={() => {
											setSelectedCategory(category);
											setPage(1); // Reset to page 1 on category change
										}}
										className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
											selectedCategory === category
												? "bg-blue-600 text-white"
												: "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
										}`}
									>
										{category}
									</button>
								))}
							</div>
						</div>

						{/* Results Info */}
						<div className="mb-8 flex items-center justify-between">
							<p className="text-sm text-gray-600">
								Showing{" "}
								<span className="font-semibold text-gray-900">
									{filteredCampaigns.length}
								</span>{" "}
								campaign
								{filteredCampaigns.length !== 1 ? "s" : ""}
								{campaignsResponse?.total !== undefined && (
									<span>
										{" "}
										of{" "}
										<span className="font-semibold">
											{campaignsResponse.total}
										</span>{" "}
										total
									</span>
								)}
							</p>
						</div>

						{/* Campaign Grid */}
						{filteredCampaigns.length > 0 ? (
							<>
								<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
									{filteredCampaigns.map((campaign) => {
										console.log(campaign);
										return (
											<CampaignCard
												key={campaign?.campaign_id}
												campaign={campaign}
											/>
										);
									})}
								</div>

								{/* Pagination */}
								{campaignsResponse?.total_pages &&
									campaignsResponse.total_pages > 1 && (
										<div className="flex items-center justify-center gap-2 mb-12">
											<button
												onClick={() => setPage(Math.max(1, page - 1))}
												disabled={page === 1}
												className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
											>
												Previous
											</button>
											<span className="text-sm text-gray-600">
												Page <span className="font-semibold">{page}</span> of{" "}
												<span className="font-semibold">
													{campaignsResponse.total_pages}
												</span>
											</span>
											<button
												onClick={() =>
													setPage(
														Math.min(campaignsResponse.total_pages!, page + 1)
													)
												}
												disabled={page === campaignsResponse.total_pages}
												className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
											>
												Next
											</button>
										</div>
									)}
							</>
						) : (
							<EmptyState
								title="No campaigns found"
								description="Try adjusting your search filters to find more programs"
								action={{
									label: "Clear Filters",
									onClick: () => {
										setSearchQuery("");
										setSelectedCategory("All");
										setPage(1);
									},
								}}
							/>
						)}
					</>
				)}

				{/* Info Section */}
				<div className="grid gap-6 md:grid-cols-3">
					<div className="bg-white rounded-lg shadow p-6">
						<TrendingUp className="h-8 w-8 text-blue-600 mb-4" />
						<h3 className="font-semibold text-gray-900 mb-2">
							Growing Opportunities
						</h3>
						<p className="text-sm text-gray-600">
							Join programs with proven track records and growing conversion
							rates
						</p>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<Users className="h-8 w-8 text-blue-600 mb-4" />
						<h3 className="font-semibold text-gray-900 mb-2">
							Active Communities
						</h3>
						<p className="text-sm text-gray-600">
							Network with thousands of partners in each program
						</p>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<DollarSign className="h-8 w-8 text-blue-600 mb-4" />
						<h3 className="font-semibold text-gray-900 mb-2">
							Competitive Payouts
						</h3>
						<p className="text-sm text-gray-600">
							Earn competitive commissions with real-time tracking and instant
							payouts
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
