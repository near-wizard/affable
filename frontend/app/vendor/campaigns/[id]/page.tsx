"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
	Zap,
	HelpCircle,
} from "lucide-react";
import Confetti from "react-confetti";
import { useCampaignDetail } from "@/hooks/use-api";
import {
	GridSkeleton,
	ErrorBoundary,
	EmptyState,
} from "@/components/loading-skeleton";
import { useCurrentVendor } from "@/hooks/use-api";
import { useVendorOnboarding } from "@/hooks/use-vendor-onboarding";
import { PartnerInvitationForm } from "@/components/partner-invitation-form";

export default function CampaignDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const campaignId = params.id as string;
	const [activeTab, setActiveTab] = useState<"overview" | "partners" | "analytics">("overview");
	const [requirements, setRequirements] = useState<{
		campaign_id: string;
		stripe_connected: boolean;
		payment_valid: boolean;
		can_launch: boolean;
		missing_requirements: string[];
	} | null>(null);
	const [loadingRequirements, setLoadingRequirements] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [confettiActive, setConfettiActive] = useState(false);
	const [launching, setLaunching] = useState(false);

	// Fetch campaign details
	const { data: campaign, loading: campaignLoading, error: campaignError } = useCampaignDetail(campaignId);
	const { data: vendor } = useCurrentVendor();
	const { markStepComplete } = useVendorOnboarding();

	// Fetch campaign requirements
	useEffect(() => {
		const fetchRequirements = async () => {
			if (!campaignId) return;

			setLoadingRequirements(true);
			try {
				const response = await fetch(`/api/v1/campaigns/${campaignId}/requirements`);
				if (response.ok) {
					const data = await response.json();
					setRequirements(data);
				}
			} catch (error) {
				console.error("Failed to fetch requirements:", error);
			} finally {
				setLoadingRequirements(false);
			}
		};

		fetchRequirements();
	}, [campaignId]);

	const handleLaunchCampaign = async () => {
		if (!requirements?.can_launch) return;

		setLaunching(true);
		try {
			const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "active" }),
			});

			if (response.ok) {
				// Trigger confetti
				setConfettiActive(true);
				setTimeout(() => {
					setConfettiActive(false);
				}, 3000);

				// Auto-complete onboarding step
				try {
					await markStepComplete('campaign_launched');
					console.log('Campaign launched step marked complete');
				} catch (error) {
					console.error('Failed to mark campaign_launched step:', error);
				}

				// Reload the page after a short delay to allow onboarding update
				setTimeout(() => {
					window.location.reload();
				}, 500);
			}
		} catch (error) {
			console.error("Failed to launch campaign:", error);
		} finally {
			setLaunching(false);
		}
	};

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
			{confettiActive && <Confetti numberOfPieces={300 + Math.random() * 300} />}

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
									<p className="text-2xl font-bold text-foreground">{campaign.total_partners || 0}</p>
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

								{loadingRequirements ? (
									<div className="text-sm text-muted-foreground">Loading requirements...</div>
								) : requirements ? (
									<div className="space-y-4">
										{/* Requirements Checklist */}
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-sm">
												{requirements.stripe_connected ? (
													<>
														<CheckCircle size={16} className="text-green-600" />
														<span className="text-foreground">Stripe Account Connected</span>
													</>
												) : (
													<>
														<AlertCircle size={16} className="text-red-600" />
														<span className="text-foreground">Stripe Account Connected</span>
													</>
												)}
											</div>
											<div className="flex items-center gap-2 text-sm">
												{requirements.payment_valid ? (
													<>
														<CheckCircle size={16} className="text-green-600" />
														<span className="text-foreground">Payment Verified</span>
													</>
												) : (
													<>
														<AlertCircle size={16} className="text-red-600" />
														<span className="text-foreground">Payment Verified</span>
													</>
												)}
											</div>
										</div>

										{/* Launch Button for Draft Campaigns */}
										{campaign.status === "draft" && (
											<div className="relative">
												<button
													onClick={handleLaunchCampaign}
													onMouseEnter={() => !requirements.can_launch && setShowTooltip(true)}
													onMouseLeave={() => setShowTooltip(false)}
													disabled={!requirements.can_launch || launching}
													className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
														requirements.can_launch && !launching
															? "bg-green-600 text-white hover:bg-green-700"
															: "bg-gray-300 text-gray-500 cursor-not-allowed"
													}`}
												>
													<Zap size={16} />
													{launching ? "Launching..." : "Launch Campaign"}
												</button>

												{/* Tooltip */}
												{showTooltip && !requirements.can_launch && requirements.missing_requirements.length > 0 && (
													<div className="absolute bottom-full mb-2 left-0 right-0 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
														<div className="flex items-start gap-2 mb-1">
															<HelpCircle size={14} className="mt-0.5 flex-shrink-0" />
															<span className="font-semibold">Missing Requirements:</span>
														</div>
														<ul className="list-disc list-inside space-y-1 ml-5">
															{requirements.missing_requirements.map((req, index) => (
																<li key={index}>{req}</li>
															))}
														</ul>
													</div>
												)}
											</div>
										)}

										{/* Active Campaign Message */}
										{campaign.status === "active" && (
											<div className="flex items-center gap-2">
												<CheckCircle size={18} className="text-green-600" />
												<span className="text-sm text-foreground">Campaign is active</span>
											</div>
										)}
									</div>
								) : (
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
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === "partners" && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-2xl font-bold text-foreground">Campaign Partners</h2>
								{campaign.total_partners > 0 && (
									<button
										onClick={() => router.push(`/vendor/campaigns/${campaignId}/partners`)}
										className="flex items-center gap-2 px-4 py-2 border border-blueberry bg-primary/100 text-white rounded-lg hover:bg-primary/90 transition"
									>
										<Users size={16} />
										Manage All Partners
									</button>
								)}
							</div>

							{campaign.total_partners === 0 ? (
								<EmptyState
									title="No partners yet"
									description="This campaign doesn't have any partners enrolled. Invite partners to grow your reach!"
								/>
							) : (
								<div className="bg-card rounded-lg p-6 border border-border">
									<p className="text-muted-foreground">Total partners: {campaign.total_partners}</p>
									<p className="text-sm text-muted-foreground mt-2">
										View and manage all partners on the Partners page.
									</p>
								</div>
							)}
						</div>

						{/* Invitation Form Sidebar */}
						<div>
							<PartnerInvitationForm
								campaignId={campaignId}
								campaignName={campaign.name}
								onSuccess={() => {
									// Optionally refresh campaign data here
								}}
							/>
						</div>
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
								<span className="text-sm text-muted-foreground">Total Clicks</span>
								<p className="text-3xl font-bold text-secondary mt-2">
									{(campaign.total_clicks || 0).toLocaleString()}
								</p>
							</div>
							<div className="bg-card rounded-lg p-6 border border-border">
								<span className="text-sm text-muted-foreground">Conversion Rate</span>
								<p className="text-3xl font-bold text-accent mt-2">
									{campaign.conversion_rate || 0}%
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
