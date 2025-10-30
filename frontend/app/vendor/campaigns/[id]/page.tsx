"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
	ArrowLeft,
	Edit,
	Users,
	TrendingUp,
	DollarSign,
	Link as LinkIcon,
	Share2,
	Copy,
	CheckCircle,
	Clock,
	AlertCircle,
} from "lucide-react";
import { useCampaignDetail } from "@/hooks/use-api";
import {
	GridSkeleton,
	ErrorBoundary,
	EmptyState,
} from "@/components/loading-skeleton";
import { useCurrentVendor } from "@/hooks/use-api";

export default function CampaignDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const campaignId = params.id as string;
	const [activeTab, setActiveTab] = useState<"overview" | "partners" | "analytics">("overview");

	// Fetch campaign details
	const { data: campaign, loading: campaignLoading, error: campaignError } = useCampaignDetail(campaignId);
	const { data: vendor } = useCurrentVendor();

	if (campaignError) {
		return <ErrorBoundary error={campaignError.message} />;
	}

	if (campaignLoading) {
		return <GridSkeleton columns={1} items={3} />;
	}

	if (!campaign) {
		return <EmptyState title="Campaign not found" description="The campaign you're looking for doesn't exist." />;
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800";
			case "paused":
				return "bg-yellow-100 text-yellow-800";
			case "draft":
				return "bg-blue-100 text-blue-800";
			case "ended":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-muted text-foreground";
		}
	};

	const commissionDisplay = campaign.commission_type === "percentage"
		? `${campaign.commission_value}%`
		: `$${campaign.commission_value}`;

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="bg-background border-b border-border shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center gap-4 mb-4">
						<button
							onClick={() => router.back()}
							className="p-2 hover:bg-muted rounded-lg transition"
						>
							<ArrowLeft size={20} className="text-primary" />
						</button>
						<div>
							<h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
							<p className="text-muted-foreground mt-1">{campaign.description}</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-4 justify-between">
						<div className="flex items-center gap-2">
							<span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
								{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
							</span>
							{vendor?.vendor_id === campaign.vendor_id && (
								<button className="flex items-center gap-2 px-4 py-2 border border-blueberry bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition">
									<Edit size={16} />
									Edit Campaign
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="bg-background border-b border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex gap-8">
						{[
							{ id: "overview", label: "Overview" },
							{ id: "partners", label: "Partners" },
							{ id: "analytics", label: "Analytics" },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as any)}
								className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
									activeTab === tab.id
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === "overview" && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main Info */}
						<div className="lg:col-span-2 space-y-6">
							{/* Campaign Stats */}
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div className="bg-card rounded-lg p-4 border border-border">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Partners</span>
										<Users size={16} className="text-primary" />
									</div>
									<p className="text-2xl font-bold text-foreground">{campaign.partner_count || 0}</p>
								</div>
								<div className="bg-card rounded-lg p-4 border border-border">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Total Clicks</span>
										<LinkIcon size={16} className="text-secondary" />
									</div>
									<p className="text-2xl font-bold text-foreground">{(campaign.total_clicks || 0).toLocaleString()}</p>
								</div>
								<div className="bg-card rounded-lg p-4 border border-border">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Conversions</span>
										<TrendingUp size={16} className="text-accent" />
									</div>
									<p className="text-2xl font-bold text-foreground">{campaign.total_conversions || 0}</p>
								</div>
							</div>

							{/* Commission & Details */}
							<div className="bg-card rounded-lg p-6 border border-border">
								<h2 className="text-xl font-bold text-foreground mb-4">Campaign Details</h2>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<span className="text-sm text-muted-foreground">Commission Type</span>
										<p className="text-lg font-semibold text-foreground mt-1">
											{campaign.commission_type === "percentage" ? "Percentage" : "Flat Rate"}
										</p>
									</div>
									<div>
										<span className="text-sm text-muted-foreground">Commission Value</span>
										<p className="text-lg font-semibold text-primary mt-1">{commissionDisplay}</p>
									</div>
									<div>
										<span className="text-sm text-muted-foreground">Category</span>
										<p className="text-lg font-semibold text-foreground mt-1">{campaign.category || "General"}</p>
									</div>
									<div>
										<span className="text-sm text-muted-foreground">Created</span>
										<p className="text-lg font-semibold text-foreground mt-1">
											{campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : "-"}
										</p>
									</div>
								</div>
							</div>

							{/* Description */}
							<div className="bg-card rounded-lg p-6 border border-border">
								<h2 className="text-xl font-bold text-foreground mb-4">About This Campaign</h2>
								<p className="text-foreground leading-relaxed">{campaign.description || "No description provided."}</p>
							</div>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Quick Links */}
							<div className="bg-card rounded-lg p-6 border border-border">
								<h3 className="font-bold text-foreground mb-4">Campaign Links</h3>
								<div className="space-y-3">
									<button className="w-full flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition text-sm">
										<Share2 size={16} />
										Share Campaign
									</button>
									<button className="w-full flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition text-sm">
										<Copy size={16} />
										Copy Link
									</button>
								</div>
							</div>

							{/* Status Info */}
							<div className="bg-card rounded-lg p-6 border border-border">
								<h3 className="font-bold text-foreground mb-4">Campaign Status</h3>
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										{campaign.status === "active" ? (
											<>
												<CheckCircle size={18} className="text-green-600" />
												<span className="text-sm text-foreground">Campaign is active</span>
											</>
										) : campaign.status === "paused" ? (
											<>
												<Clock size={18} className="text-yellow-600" />
												<span className="text-sm text-foreground">Campaign is paused</span>
											</>
										) : (
											<>
												<AlertCircle size={18} className="text-red-600" />
												<span className="text-sm text-foreground">Campaign is {campaign.status}</span>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === "partners" && (
					<div>
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-foreground">Campaign Partners</h2>
							<button
								onClick={() => router.push(`/vendor/campaigns/${campaignId}/partners`)}
								className="flex items-center gap-2 px-4 py-2 border border-blueberry bg-primary/100 text-white rounded-lg hover:bg-primary/90 transition"
							>
								<Users size={16} />
								Manage Partners
							</button>
						</div>

						{campaign.partner_count === 0 ? (
							<EmptyState
								title="No partners yet"
								description="This campaign doesn't have any partners enrolled. Invite partners to grow your reach!"
							/>
						) : (
							<p className="text-muted-foreground">Partners content would load here. Total: {campaign.partner_count}</p>
						)}
					</div>
				)}

				{activeTab === "analytics" && (
					<div>
						<h2 className="text-2xl font-bold text-foreground mb-6">Campaign Analytics</h2>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="bg-card rounded-lg p-6 border border-border">
								<span className="text-sm text-muted-foreground">Total Revenue</span>
								<p className="text-3xl font-bold text-primary mt-2">
									${(campaign.total_revenue || 0).toLocaleString()}
								</p>
							</div>
							<div className="bg-card rounded-lg p-6 border border-border">
								<span className="text-sm text-muted-foreground">Click Through Rate</span>
								<p className="text-3xl font-bold text-secondary mt-2">
									{campaign.total_clicks && campaign.impressions
										? ((campaign.total_clicks / campaign.impressions) * 100).toFixed(2)
										: "0"}
									%
								</p>
							</div>
							<div className="bg-card rounded-lg p-6 border border-border">
								<span className="text-sm text-muted-foreground">Conversion Rate</span>
								<p className="text-3xl font-bold text-accent mt-2">
									{campaign.total_clicks && campaign.total_conversions
										? ((campaign.total_conversions / campaign.total_clicks) * 100).toFixed(2)
										: "0"}
									%
								</p>
							</div>
							<div className="bg-card rounded-lg p-6 border border-border">
								<span className="text-sm text-muted-foreground">Avg. Commission</span>
								<p className="text-3xl font-bold text-foreground mt-2">{commissionDisplay}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
