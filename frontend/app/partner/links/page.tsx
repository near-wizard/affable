"use client";
import { useState, useEffect, useMemo } from "react";
import {
	Plus,
	Copy,
	ExternalLink,
	BarChart2,
	Trash2,
	Check,
	AlertCircle,
	Loader,
	ChevronDown,
	Edit2,
	X,
} from "lucide-react";
import {
	useCurrentPartner,
	usePartnerLinks,
	usePartnerCampaigns,
	useCreateLink,
} from "@/hooks/use-api";
import { apiClient } from "@/lib/api-client";
import UtmDropdown from "@/components/UtmDropdown";

interface LinkFormData {
	campaignPartnerId: number;
	linkLabel: string;
	utmParams?: {
		utm_source?: string;
		utm_medium?: string;
		utm_campaign?: string;
		utm_content?: string;
	};
}

// UTM Parameters Standard Options
// UTM Source definitions with descriptions
const UTM_SOURCES_WITH_DESCRIPTIONS = [
	{
		value: "direct",
		label: "Direct",
		description:
			"Traffic that came directly from your own channels or non-tracked sources",
	},
	{
		value: "google",
		label: "Google",
		description:
			"Traffic from Google Search, Google Ads, or other Google properties",
	},
	{
		value: "facebook",
		label: "Facebook",
		description: "Traffic from Facebook or Instagram posts and ads",
	},
	{
		value: "twitter",
		label: "Twitter",
		description: "Traffic from Twitter/X posts and interactions",
	},
	{
		value: "linkedin",
		label: "LinkedIn",
		description: "Traffic from LinkedIn posts, articles, and ads",
	},
	{
		value: "instagram",
		label: "Instagram",
		description: "Traffic from Instagram posts, stories, and ads",
	},
	{
		value: "tiktok",
		label: "TikTok",
		description: "Traffic from TikTok videos",
	},
	{
		value: "youtube",
		label: "YouTube",
		description: "Traffic from YouTube videos, descriptions, and cards",
	},
	{
		value: "reddit",
		label: "Reddit",
		description: "Traffic from Reddit posts and comments",
	},
	{
		value: "email",
		label: "Email",
		description: "Traffic from email campaigns or newsletters",
	},
	{
		value: "blog",
		label: "Blog",
		description: "Traffic from your own blog posts or articles",
	},
	{
		value: "newsletter",
		label: "Newsletter",
		description: "Traffic from newsletter distributions",
	},
	{
		value: "organic",
		label: "Organic",
		description: "Organic search traffic or other organic sources",
	},
];

const UTM_SOURCES = UTM_SOURCES_WITH_DESCRIPTIONS.map((s) => s.value);

// UTM Medium definitions with descriptions
const MEDIUM_DESCRIPTIONS: Record<string, string> = {
	direct: "Direct traffic without a specific medium",
	organic: "Organic search results",
	cpc: "Cost-per-click paid ads (Google Ads, Facebook Ads, etc.)",
	shopping: "Google Shopping or product listing ads",
	social: "Social media posts or shares",
	video: "Video platform traffic",
	post: "Blog post or article",
	"guest-post": "Guest post on another blog",
	email: "Email campaign",
	newsletter: "Newsletter distribution",
	seo: "Search engine optimization results",
};

const UTM_MEDIA_BY_SOURCE: Record<string, string[]> = {
	direct: ["direct"],
	google: ["organic", "cpc", "shopping"],
	facebook: ["social", "cpc"],
	twitter: ["social", "organic"],
	linkedin: ["social", "cpc"],
	instagram: ["social", "cpc"],
	tiktok: ["social", "organic"],
	youtube: ["video", "organic"],
	reddit: ["social", "organic"],
	email: ["email"],
	blog: ["post", "guest-post"],
	newsletter: ["email", "newsletter"],
	organic: ["organic", "seo"],
};

// Sanitize campaign name for use in URLs
function sanitizeForUrl(input: string): string {
	return input
		.toLowerCase() // Convert to lowercase
		.trim() // Remove leading/trailing whitespace
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/[^a-z0-9-]/g, ""); // Remove illegal URL characters
}

export default function PartnerLinks() {
	const { data: currentPartner, loading: partnerLoading } = useCurrentPartner();
	const partnerId = currentPartner?.partner_id?.toString();
	const { data: campaignsData, loading: campaignsLoading } =
		usePartnerCampaigns(partnerId);
	const { data: linksData, loading: linksLoading } = usePartnerLinks(partnerId);
	const {
		mutate: createLink,
		loading: creatingLink,
		error: createError,
	} = useCreateLink();

	// Extract campaigns from response
	const enrolledCampaigns = campaignsData?.data || [];
	// Extract links from response (handle both paginated and non-paginated responses)
	const links = linksData?.data || linksData || [];

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [copiedLink, setCopiedLink] = useState<number | null>(null);
	const [editingContentUrlId, setEditingContentUrlId] = useState<number | null>(null);
	const [editingContentUrlValue, setEditingContentUrlValue] = useState("");
	const [editingContentUrlError, setEditingContentUrlError] = useState("");
	const [formData, setFormData] = useState<LinkFormData>({
		campaignPartnerId: 0,
		linkLabel: "",
		utmParams: {
			utm_source: "",
			utm_medium: "",
			utm_campaign: "",
			utm_content: "",
		},
	});
	const [formError, setFormError] = useState("");
	const [selectedCampaign, setSelectedCampaign] = useState("all");

	const copyToClipboard = (url: string, id: number) => {
		navigator.clipboard.writeText(url);
		setCopiedLink(id);
		setTimeout(() => setCopiedLink(null), 2000);
	};


	const getContentBadgeStyles = (status: string) => {
		switch (status) {
			case "no_content":
				return {
					bgColor: "bg-slate-100",
					textColor: "text-slate-600",
					label: "No Content",
				};
			case "unverified":
				return {
					bgColor: "bg-amber-100",
					textColor: "text-amber-700",
					label: "Unverified",
				};
			case "verified":
				return {
					bgColor: "bg-emerald-100",
					textColor: "text-emerald-700",
					label: "Verified",
				};
			case "failed":
				return {
					bgColor: "bg-rose-100",
					textColor: "text-rose-700",
					label: "Verification Failed",
				};
			default:
				return {
					bgColor: "bg-neutral-100",
					textColor: "text-neutral-600",
					label: "Unknown",
				};
		}
	};

	// Validate URL format
	const isValidUrl = (url: string): boolean => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	};

	const handleEditContentUrl = (linkId: number, currentUrl: string) => {
		setEditingContentUrlId(linkId);
		setEditingContentUrlValue(currentUrl || "");
		setEditingContentUrlError("");
	};

	const handleSaveContentUrl = async (linkId: number) => {
		setEditingContentUrlError("");

		// Validate URL
		if (!editingContentUrlValue.trim()) {
			setEditingContentUrlError("URL cannot be empty");
			return;
		}

		if (!isValidUrl(editingContentUrlValue)) {
			setEditingContentUrlError("Please enter a valid URL (e.g., https://example.com)");
			return;
		}

		try {
			await apiClient.post(`/v1/links/${linkId}/attach-content`, {
				content_url: editingContentUrlValue,
			});

			setEditingContentUrlId(null);
			setEditingContentUrlValue("");

			// Wait 2 seconds and then reload to show updated content with verification status
			// This gives the Celery task a moment to potentially complete verification
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (error: any) {
			console.error("Error updating content URL:", error);
			setEditingContentUrlError(error?.message || "Failed to update content URL. Please try again.");
		}
	};

	const handleCancelEditContentUrl = () => {
		setEditingContentUrlId(null);
		setEditingContentUrlValue("");
		setEditingContentUrlError("");
	};

	// Get available media options based on selected source
	const availableMedia = useMemo(() => {
		const source = formData.utmParams?.utm_source || "";
		return source && UTM_MEDIA_BY_SOURCE[source]
			? UTM_MEDIA_BY_SOURCE[source]
			: [];
	}, [formData.utmParams?.utm_source]);

	const handleOpenModal = () => {
		setShowCreateModal(true);
		setFormError("");
	};

	// Auto-populate utm_campaign when campaign selection changes
	const handleCampaignChange = (campaignPartnerId: number) => {
		setFormData({
			...formData,
			campaignPartnerId,
		});

		// Find selected campaign and auto-populate utm_campaign if not already set
		if (campaignPartnerId > 0) {
			const selectedCamp = approvedCampaigns.find(
				(c: any) => c.campaign_partner_id === campaignPartnerId
			);
			if (selectedCamp && !formData.utmParams?.utm_campaign) {
				setFormData((prev) => ({
					...prev,
					utmParams: {
						...prev.utmParams,
						utm_campaign: sanitizeForUrl(selectedCamp.name || ""),
					},
				}));
			}
		}
	};

	const handleCloseModal = () => {
		setShowCreateModal(false);
		setFormError("");
	};

	const handleCreateLink = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");

		// Validate required fields
		if (!formData.campaignPartnerId) {
			setFormError("Please select a campaign");
			return;
		}

		if (!formData.linkLabel.trim()) {
			setFormError("Please enter a link label");
			return;
		}

		try {
			const payload = {
				campaign_partner_id: formData.campaignPartnerId,
				link_label: formData.linkLabel,
				custom_params: {}, // Empty by default; can be extended in future
				utm_params:
					Object.fromEntries(
						Object.entries(formData.utmParams || {}).filter(([, v]) => v)
					) || undefined,
			};

			await createLink(payload);
			setShowCreateModal(false);
			setFormData({
				campaignPartnerId: 0,
				linkLabel: "",
				utmParams: {
					utm_source: "",
					utm_medium: "",
					utm_campaign: "",
					utm_content: "",
				},
			});
			// Refetch links to show the newly created link
			window.location.reload();
		} catch (error) {
			console.error("Failed to create link:", error);
			if (error instanceof Error) {
				setFormError(error.message || "Failed to create link");
			} else {
				setFormError("Failed to create link. Please try again.");
			}
		}
	};

	// Filter links by selected campaign
	const filteredLinks =
		selectedCampaign === "all"
			? links
			: links?.filter(
					(link) => link.campaign_partner_id === parseInt(selectedCampaign)
			  );

	if (partnerLoading || campaignsLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (!currentPartner) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle size={48} className="mx-auto text-red-600 mb-4" />
					<p className="text-gray-800 font-semibold">
						Unable to load partner data
					</p>
					<p className="text-gray-600 mt-2">
						Please ensure you are logged in as a partner
					</p>
				</div>
			</div>
		);
	}

	// Filter campaigns to only approved ones (where partner can create links)
	const approvedCampaigns =
		enrolledCampaigns?.filter((camp: any) => camp.status === "approved") || [];

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Affiliate Links
						</h1>
						<p className="text-gray-600 mt-2">
							Create and manage your tracking links. One link per piece of
							content helps you understand what works best.
						</p>
					</div>
					<button
						onClick={handleOpenModal}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
					>
						<Plus size={20} />
						Create Link
					</button>
				</div>

				{/* Campaign Filter */}
				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Filter by Campaign
					</label>
					<select
						value={selectedCampaign}
						onChange={(e) => setSelectedCampaign(e.target.value)}
						className="w-full max-w-xs border border-gray-300 rounded-lg p-2 text-gray-900"
					>
						<option value="all">All Campaigns</option>
						{approvedCampaigns.map((campaign: any) => (
							<option
								key={campaign.campaign_partner_id}
								value={campaign.campaign_partner_id}
							>
								{campaign.name || "Unnamed Campaign"}
							</option>
						))}
					</select>
				</div>

				{/* Links List */}
				{linksLoading ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Loading links...</p>
					</div>
				) : filteredLinks && filteredLinks.length > 0 ? (
					<div className="grid gap-4">
						{filteredLinks.map((link: any) => (
							<div
								key={link.partner_link_id}
								className="bg-white rounded-lg border border-gray-200 p-6"
							>
								<div className="flex justify-between items-start mb-4">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-lg font-semibold text-gray-900">
												{link.link_label}
											</h3>
											{(() => {
												const badgeStyle = getContentBadgeStyles(
													link.content_verification_status || "no_content"
												);
												return (
													<span
														className={`px-3 py-1 rounded-full text-xs font-medium ${badgeStyle.bgColor} ${badgeStyle.textColor}`}
													>
														{badgeStyle.label}
													</span>
												);
											})()}
										</div>
										<p className="text-sm text-gray-500 mt-1">
											Campaign:{" "}
											{link.campaign_partner?.campaign_version?.name ||
												"Unknown"}
										</p>

										{/* Content URL Display and Edit */}
										{editingContentUrlId === link.partner_link_id ? (
											<div className="mt-3 space-y-2">
												<input
													type="url"
													value={editingContentUrlValue}
													onChange={(e) => setEditingContentUrlValue(e.target.value)}
													placeholder="https://example.com"
													className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
														editingContentUrlError
															? "border-red-500"
															: "border-gray-300"
													}`}
												/>
												{editingContentUrlError && (
													<p className="text-xs text-red-600">{editingContentUrlError}</p>
												)}
												<div className="flex gap-2">
													<button
														onClick={() => handleSaveContentUrl(link.partner_link_id)}
														className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
													>
														Save
													</button>
													<button
														onClick={handleCancelEditContentUrl}
														className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
													>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<div className="flex items-start gap-2 mt-3">
												{link.content_url ? (
													<>
														<div className="flex-1">
															<p className="text-xs text-gray-500 mb-1">Content URL:</p>
															<a
																href={link.content_url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-xs text-gray-600 hover:text-blue-600 break-all"
															>
																{link.content_url}
															</a>
														</div>
														<button
															onClick={() =>
																handleEditContentUrl(
																	link.partner_link_id,
																	link.content_url || ""
																)
															}
															className="p-1 hover:bg-gray-100 rounded mt-4"
															title="Edit content URL"
														>
															<Edit2 size={16} className="text-gray-400" />
														</button>
													</>
												) : (
													<button
														onClick={() =>
															handleEditContentUrl(link.partner_link_id, "")
														}
														className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 mt-1"
														title="Add content URL"
													>
														<Edit2 size={16} />
														<span className="text-xs">Add content URL</span>
													</button>
												)}
											</div>
										)}
									</div>
									<div className="flex gap-2">
										<button
											onClick={() =>
												copyToClipboard(link.tracking_url, link.partner_link_id)
											}
											className="p-2 hover:bg-gray-100 rounded"
											title="Copy tracking URL"
										>
											{copiedLink === link.partner_link_id ? (
												<Check size={20} className="text-green-600" />
											) : (
												<Copy size={20} className="text-gray-600" />
											)}
										</button>
										<a
											href={link.tracking_url}
											target="_blank"
											rel="noopener noreferrer"
											className="p-2 hover:bg-gray-100 rounded"
											title="Test link"
										>
											<ExternalLink size={20} className="text-gray-600" />
										</a>
									</div>
								</div>

								{/* Link URLs */}
								<div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm">
									<div className="mb-3">
										<p className="text-gray-600 text-xs mb-1">Tracking URL:</p>
										<p className="text-gray-900 break-all">
											{link.tracking_url}
										</p>
									</div>
									<div>
										<p className="text-gray-600 text-xs mb-1">Destination:</p>
										<p className="text-gray-900 break-all text-xs">
											{link.full_url}
										</p>
									</div>
								</div>

								{/* Stats */}
								<div className="grid grid-cols-4 gap-4">
									<div>
										<p className="text-sm text-gray-600">Clicks</p>
										<p className="text-2xl font-bold text-gray-900">
											{link.click_count || 0}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Conversions</p>
										<p className="text-2xl font-bold text-gray-900">-</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Conv. Rate</p>
										<p className="text-2xl font-bold text-gray-900">-</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Earnings</p>
										<p className="text-2xl font-bold text-gray-900">-</p>
									</div>
								</div>

								<p className="text-xs text-gray-500 mt-4">
									Created: {new Date(link.created_at).toLocaleDateString()}
								</p>
							</div>
						))}
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
						<p className="text-gray-600">
							No links yet. Create your first link to start tracking!
						</p>
					</div>
				)}
			</div>

			{/* Create Link Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-md w-full p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Create New Link
						</h2>

						{createError && (
							<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded flex items-start gap-2">
								<AlertCircle size={20} className="mt-0.5" />
								<div>
									<p className="font-semibold">Error</p>
									<p className="text-sm">{createError.message}</p>
								</div>
							</div>
						)}

						{formError && (
							<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
								{formError}
							</div>
						)}

						<form onSubmit={handleCreateLink} className="space-y-4">
							{/* Campaign Selection */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Campaign *
								</label>
								<select
									value={formData.campaignPartnerId}
									onChange={(e) =>
										handleCampaignChange(parseInt(e.target.value))
									}
									className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
									disabled={creatingLink}
								>
									<option value={0}>Select a campaign...</option>
									{approvedCampaigns.map((campaign: any) => (
										<option
											key={campaign.campaign_partner_id}
											value={campaign.campaign_partner_id}
										>
											{campaign.name || "Unnamed Campaign"}
										</option>
									))}
								</select>
								<p className="text-xs text-gray-500 mt-1">
									Only approved campaigns are available
								</p>
							</div>

							{/* Link Label */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Link Label (e.g., "Blog Post Title") *
								</label>
								<input
									type="text"
									value={formData.linkLabel}
									onChange={(e) =>
										setFormData({ ...formData, linkLabel: e.target.value })
									}
									placeholder="e.g., Blog Post CTA, YouTube Description"
									className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
									disabled={creatingLink}
									maxLength={255}
								/>
							</div>

							{/* UTM Parameters */}
							<div className="pt-2 border-t border-gray-200">
								<p className="text-sm font-medium text-gray-700 mb-3">
									Expected UTM Parameters (Optional)
								</p>

								<div className="space-y-3">
									{/* UTM Source with custom dropdown and tooltips */}
									<div>
										<UtmDropdown
											label="UTM Source"
											options={UTM_SOURCES_WITH_DESCRIPTIONS}
											value={formData.utmParams?.utm_source || ""}
											onChange={(value) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_source: value,
													},
												})
											}
											placeholder="Select a source..."
											disabled={creatingLink}
											descriptions={Object.fromEntries(
												UTM_SOURCES_WITH_DESCRIPTIONS.map((s) => [
													s.value,
													s.description || "",
												])
											)}
										/>
										<input
											type="text"
											placeholder="Or type custom value"
											value={formData.utmParams?.utm_source || ""}
											onChange={(e) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_source: e.target.value,
													},
												})
											}
											className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900 mt-1"
											disabled={creatingLink}
										/>
									</div>

									{/* UTM Medium with custom dropdown filtered by source and tooltips */}
									<div>
										<UtmDropdown
											label="UTM Medium"
											options={availableMedia.map((medium) => ({
												value: medium,
												label: medium,
											}))}
											value={formData.utmParams?.utm_medium || ""}
											onChange={(value) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_medium: value,
													},
												})
											}
											placeholder={
												formData.utmParams?.utm_source
													? "Select a medium..."
													: "Select a source first"
											}
											disabled={creatingLink || !formData.utmParams?.utm_source}
											descriptions={MEDIUM_DESCRIPTIONS}
										/>
										<input
											type="text"
											placeholder="Or type custom value"
											value={formData.utmParams?.utm_medium || ""}
											onChange={(e) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_medium: e.target.value,
													},
												})
											}
											className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900 mt-1"
											disabled={creatingLink}
										/>
									</div>

									{/* UTM Campaign - Auto-populated but can be edited */}
									<div>
										<label className="text-xs text-gray-600 mb-1 block">
											UTM Campaign
											<span className="text-gray-400 text-xs ml-1">
												(auto-filled from campaign name)
											</span>
										</label>
										<input
											type="text"
											placeholder="Auto-filled from campaign name"
											value={formData.utmParams?.utm_campaign || ""}
											onChange={(e) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_campaign: e.target.value,
													},
												})
											}
											className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
											disabled={creatingLink}
										/>
									</div>

									{/* UTM Content */}
									<div>
										<label className="text-xs text-gray-600 mb-1 block">
											UTM Content
										</label>
										<input
											type="text"
											placeholder="e.g., hero-button, sidebar-ad, featured-image"
											value={formData.utmParams?.utm_content || ""}
											onChange={(e) =>
												setFormData({
													...formData,
													utmParams: {
														...formData.utmParams,
														utm_content: e.target.value,
													},
												})
											}
											className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900"
											disabled={creatingLink}
										/>
										<p className="text-xs text-gray-500 mt-1">
											Use this to identify specific elements within your content
											(e.g., different buttons or images on the same page)
										</p>
									</div>
								</div>
							</div>

							{/* Buttons */}
							<div className="flex gap-3 pt-4 border-t border-gray-200">
								<button
									type="button"
									onClick={handleCloseModal}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
									disabled={creatingLink}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
									disabled={creatingLink}
								>
									{creatingLink && (
										<Loader size={18} className="animate-spin" />
									)}
									{creatingLink ? "Creating..." : "Create Link"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
