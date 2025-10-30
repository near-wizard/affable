"use client";
import { useState, useEffect } from "react";
import {
	Plus,
	Search,
	MoreVertical,
	Users,
	MousePointerClick,
	TrendingUp,
	DollarSign,
	Eye,
	Edit,
	Pause,
	Play,
	Megaphone,
	AlertCircle,
} from "lucide-react";
import {
	useCurrentVendor,
	useVendorCampaigns,
	useCreateCampaign,
	useUpdateCampaign,
	useCampaignDetail,
	useCreateCampaignVersion,
} from "@/hooks/use-api";
import { ErrorBoundary, EmptyState } from "@/components/loading-skeleton";
import type { Campaign } from "@/types/api";

export type CampaignStatus = "active" | "paused" | "draft" | "archived";

export default function VendorCampaigns() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingCampaignId, setEditingCampaignId] = useState<number | null>(
		null
	);
	const [updatingCampaignId, setUpdatingCampaignId] = useState<number | null>(
		null
	);
	const [refetchCounter, setRefetchCounter] = useState(0);

	// Fetch current vendor to get vendor ID
	const {
		data: vendorData,
		loading: vendorLoading,
		error: vendorError,
	} = useCurrentVendor();

	// Fetch vendor's campaigns
	const {
		data: campaignsResponse,
		loading: campaignsLoading,
		error: campaignsError,
	} = useVendorCampaigns(
		vendorData?.vendor_id?.toString(),
		{
			page: 1,
			limit: 50,
			status: statusFilter !== "all" ? statusFilter : undefined,
		},
		refetchCounter // Add refetchCounter as dependency to trigger refetch
	);

	// Hook for updating campaigns
	const { mutate: updateCampaign, loading: isUpdating } = useUpdateCampaign();

	const handleCampaignCreated = () => {
		// Refresh the campaigns list by incrementing refetch counter
		setRefetchCounter((prev) => prev + 1);
		setShowCreateModal(false);
	};

	const handleToggleCampaignStatus = async (campaign: any) => {
		try {
			setUpdatingCampaignId(campaign.campaign_id);
			const newStatus = campaign.status === "active" ? "paused" : "active";

			await updateCampaign({
				campaignId: campaign.campaign_id,
				data: { status: newStatus },
			});

			// Refresh the campaigns list
			setRefetchCounter((prev) => prev + 1);
		} catch (error) {
			console.error("Failed to update campaign status:", error);
		} finally {
			setUpdatingCampaignId(null);
		}
	};

	const handleEditCampaign = (campaignId: number) => {
		// Open the edit modal
		setEditingCampaignId(campaignId);
	};

	const campaigns = campaignsResponse?.data || [];
	const loading = vendorLoading || campaignsLoading;
	const error = vendorError || campaignsError;

	const filteredCampaigns = campaigns.filter((campaign) => {
		if (!searchQuery) return true;
		const campaignName = campaign.name || campaign.campaign_name || "";
		const matchesSearch = campaignName
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	if (error) {
		return <ErrorBoundary error={error.message} />;
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground">Loading campaigns...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="bg-background shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
								{" "}
								<Megaphone size={32} className="text-primary" /> Campaigns
							</h1>
							<p className="text-muted-foreground mt-1">
								Manage your partner campaigns
							</p>
						</div>
						<button
							onClick={() => setShowCreateModal(true)}
							className="flex items-center gap-2 border border-blueberry bg-primary/100 text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
						>
							<Plus size={20} />
							Create Campaign
						</button>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Filters */}
				<div className="bg-background rounded-lg shadow p-4 mb-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1 relative">
							<Search
								className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
								size={20}
							/>
							<input
								type="text"
								placeholder="Search campaigns..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
							/>
						</div>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="paused">Paused</option>
							<option value="draft">Draft</option>
							<option value="archived">Archived</option>
						</select>
					</div>
				</div>

				{/* Campaigns List */}
				<div className="space-y-6">
					{filteredCampaigns.map((campaign) => (
						<div
							key={campaign.campaign_id}
							className="bg-background rounded-lg shadow hover:shadow-lg transition"
						>
							<div className="p-6">
								{/* Campaign Header */}
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<div className="flex items-center gap-3">
											<h3 className="text-xl font-bold text-foreground">
												{campaign.name}
											</h3>
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													campaign.status === "active"
														? "bg-green-100 text-green-800"
														: campaign.status === "paused"
														? "bg-yellow-100 text-yellow-800"
														: "bg-muted text-foreground"
												}`}
											>
												{campaign.status}
											</span>
										</div>
										<div className="text-sm text-muted-foreground mt-1">
											Created{" "}
											{new Date(campaign.created_at).toLocaleDateString()}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleToggleCampaignStatus(campaign)}
											disabled={
												updatingCampaignId === campaign.campaign_id ||
												isUpdating
											}
											className="p-2 hover:bg-muted rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
											title={
												campaign.status === "active"
													? "Pause campaign"
													: "Resume campaign"
											}
										>
											{updatingCampaignId === campaign.campaign_id ? (
												<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
											) : campaign.status === "active" ? (
												<Pause size={20} className="text-muted-foreground" />
											) : (
												<Play size={20} className="text-muted-foreground" />
											)}
										</button>
										<button
											onClick={() => handleEditCampaign(campaign.campaign_id)}
											className="p-2 hover:bg-muted rounded-lg transition"
											title="Edit campaign"
										>
											<Edit size={20} className="text-muted-foreground" />
										</button>
										<button
											className="p-2 hover:bg-muted rounded-lg transition"
											title="More options"
										>
											<MoreVertical
												size={20}
												className="text-muted-foreground"
											/>
										</button>
									</div>
								</div>

								{/* Campaign Stats */}
								<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
									<StatBox
										icon={<Users size={16} className="text-primary" />}
										label="Active Partners"
										value={campaign.partner_count || 0}
									/>
									<StatBox
										icon={
											<MousePointerClick size={16} className="text-primary" />
										}
										label="Total Clicks"
										value={(campaign.total_clicks || 0).toLocaleString()}
									/>
									<StatBox
										icon={<TrendingUp size={16} className="text-secondary" />}
										label="Conversions"
										value={campaign.conversion_count || 0}
									/>
									<StatBox
										icon={<TrendingUp size={16} className="text-orange-600" />}
										label="Conv. Rate"
										value={`${campaign.conversion_rate || 0}%`}
									/>
									<StatBox
										icon={<DollarSign size={16} className="text-secondary" />}
										label="Total Revenue"
										value={`$${(campaign.total_revenue || 0).toLocaleString()}`}
									/>
									<StatBox
										icon={<DollarSign size={16} className="text-primary" />}
										label="Commission"
										value={`$${(
											campaign.total_commission || 0
										).toLocaleString()}`}
									/>
								</div>

								{/* Campaign Actions */}
								<div className="flex items-center gap-3 pt-4 border-t border-border">
									<button
										onClick={() =>
											(window.location.href = `/vendor/campaigns/${campaign.campaign_id}`)
										}
										className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
									>
										<Eye size={16} />
										View Details
									</button>
									<button
										onClick={() =>
											(window.location.href = `/vendor/campaigns/${campaign.campaign_id}/partners`)
										}
										className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-background transition"
									>
										<Users size={16} />
										Manage Partners
									</button>
								</div>
							</div>
						</div>
					))}
				</div>

				{filteredCampaigns.length === 0 && (
					<EmptyState
						title="No campaigns found"
						description={
							searchQuery
								? "Try adjusting your search criteria"
								: "Get started by creating your first campaign"
						}
						action={
							!searchQuery
								? {
										label: "Create Campaign",
										onClick: () => setShowCreateModal(true),
								  }
								: undefined
						}
					/>
				)}
			</div>

			{/* Create Campaign Modal */}
			{showCreateModal && (
				<CreateCampaignModal
					onClose={() => setShowCreateModal(false)}
					onSuccess={handleCampaignCreated}
				/>
			)}

			{/* Edit Campaign Modal */}
			{editingCampaignId && (
				<EditCampaignModal
					campaignId={editingCampaignId}
					onClose={() => setEditingCampaignId(null)}
					onSuccess={() => {
						setEditingCampaignId(null);
						setRefetchCounter((prev) => prev + 1);
					}}
				/>
			)}
		</div>
	);
}

type StatBoxProps = {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	badge?: string; // optional, can be undefined
};

function StatBox({ icon, label, value, badge }: StatBoxProps) {
	return (
		<div className="bg-background rounded-lg p-3">
			<div className="flex items-center gap-2 mb-1">
				{icon}
				<span className="text-xs text-muted-foreground">{label}</span>
			</div>
			<div className="text-lg font-bold text-foreground">{value}</div>
			{badge && <div className="text-xs text-orange-600 mt-1">{badge}</div>}
		</div>
	);
}

type CommissionType = "flat" | "percentage" | "tiered";

type Tier = {
	id: number;
	min: number;
	max?: number;
	rewardType: "flat" | "percentage";
	rewardValue: number;
};

export function CreateCampaignModal({
	onClose,
	onSuccess,
}: {
	onClose: () => void;
	onSuccess?: () => void;
}) {
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		destinationUrl: "",
		commissionType: "percentage" as CommissionType,
		commissionValue: "",
		cookieDuration: 30,
		approvalRequired: false,
		isPublic: true,
		tiers: [] as Tier[],
	});

	const {
		mutate: createCampaign,
		loading: isCreating,
		error: createError,
	} = useCreateCampaign();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			// Prepare API payload - map form fields to API expected names
			const payload = {
				version: {
					name: formData.name,
					description: formData.description,
					destination_url: formData.destinationUrl,
					default_commission_type: formData.commissionType,
					default_commission_value:
						formData.commissionType === "tiered"
							? null
							: parseFloat(formData.commissionValue),
					cookie_duration_days: formData.cookieDuration,
					approval_required: formData.approvalRequired,
					is_public: formData.isPublic,
					...(formData.commissionType === "tiered" && {
						tiers: formData.tiers.map((tier, idx) => ({
							label: `Tier ${idx + 1}`,
							min_amount: Number(tier.min),
							max_amount: Number(tier.max) || 999999,
							reward_type: tier.rewardType,
							reward_value: Number(tier.rewardValue),
						})),
					}),
				},
			};

			await createCampaign(payload);

			// Success - call the onSuccess callback and close modal
			onSuccess?.();
			onClose();
		} catch (error) {
			// Error is stored in createError state, displayed below
			console.error("Failed to create campaign:", error);
		}
	};

	const addTier = () => {
		setFormData((prev) => ({
			...prev,
			tiers: [
				...prev.tiers,
				{
					id: Date.now(),
					min: 0,
					max: undefined,
					rewardType: "percentage",
					rewardValue: 0,
				},
			],
		}));
	};

	const updateTier = (id: number, key: keyof Tier, value: any) => {
		setFormData((prev) => ({
			...prev,
			tiers: prev.tiers.map((t) => (t.id === id ? { ...t, [key]: value } : t)),
		}));
	};

	const removeTier = (id: number) => {
		setFormData((prev) => ({
			...prev,
			tiers: prev.tiers.filter((t) => t.id !== id),
		}));
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-border">
					<h2 className="text-2xl font-bold text-foreground">
						Create New Campaign
					</h2>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Error message */}
					{createError && (
						<div className="flex items-center gap-3 p-4 bg-destructive/10 border border-red-200 rounded-lg">
							<AlertCircle
								size={20}
								className="text-destructive flex-shrink-0"
							/>
							<div>
								<h3 className="font-medium text-red-900">
									Error creating campaign
								</h3>
								<p className="text-sm text-red-700 mt-1">
									{createError.message}
								</p>
							</div>
						</div>
					)}

					{/* Basic fields */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Campaign Name *
						</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Description
						</label>
						<textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={3}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Destination URL *
						</label>
						<input
							type="url"
							required
							value={formData.destinationUrl}
							onChange={(e) =>
								setFormData({ ...formData, destinationUrl: e.target.value })
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
							placeholder="https://yoursite.com/signup"
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Use {"{partner_id}"} as a placeholder for the partner ID
						</p>
					</div>

					{/* Commission Type */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Commission Type *
						</label>
						<select
							value={formData.commissionType}
							onChange={(e) =>
								setFormData({
									...formData,
									commissionType: e.target.value as CommissionType,
									commissionValue: "",
									tiers: [],
								})
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							<option value="percentage">Percentage</option>
							<option value="flat">Flat Amount</option>
							<option value="tiered">Tiered</option>
						</select>
					</div>

					{/* Single Commission Value */}
					{formData.commissionType !== "tiered" && (
						<div className="mt-4">
							<label className="block text-sm font-medium text-foreground mb-2">
								Commission Value *
							</label>
							<div className="relative">
								{formData.commissionType === "percentage" && (
									<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
										%
									</span>
								)}
								{formData.commissionType === "flat" && (
									<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
										$
									</span>
								)}
								<input
									type="number"
									required
									min="0"
									step="0.01"
									value={formData.commissionValue}
									onChange={(e) =>
										setFormData({
											...formData,
											commissionValue: e.target.value,
										})
									}
									className={`w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
										formData.commissionType === "flat" ? "pl-8" : "pr-8"
									}`}
								/>
							</div>
						</div>
					)}

					{/* Tiered Commission */}
					{formData.commissionType === "tiered" && (
						<div className="mt-4">
							<h3 className="text-sm font-medium text-foreground mb-2">
								Tiers
							</h3>
							<div className="space-y-3">
								{formData.tiers.map((tier) => (
									<div
										key={tier.id}
										className="grid grid-cols-5 gap-2 items-center"
									>
										<input
											type="number"
											title="Minimum number of conversions to qualify for tier"
											min={0}
											value={tier.min}
											onChange={(e) =>
												updateTier(tier.id, "min", parseFloat(e.target.value))
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Min"
										/>
										<input
											title="Maximum number of conversions covered in the tier"
											type="number"
											min={0}
											value={tier.max ?? ""}
											onChange={(e) =>
												updateTier(
													tier.id,
													"max",
													e.target.value === ""
														? undefined
														: parseFloat(e.target.value)
												)
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Max"
										/>
										<input
											type="number"
											title="Reward Value"
											min={0}
											step={0.01}
											value={tier.rewardValue}
											onChange={(e) =>
												updateTier(
													tier.id,
													"rewardValue",
													parseFloat(e.target.value)
												)
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Reward"
										/>
										<select
											value={tier.rewardType}
											onChange={(e) =>
												updateTier(tier.id, "rewardType", e.target.value)
											}
											className="w-full px-2 py-1 border border-border rounded"
										>
											<option value="percentage">%</option>
											<option value="flat">$</option>
										</select>
										<button
											type="button"
											onClick={() => removeTier(tier.id)}
											className="text-red-500 px-2 py-1 border border-red-500 rounded border border-blueberry hover:bg-destructive/10"
										>
											Remove
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={addTier}
									className="mt-2 px-3 py-2 border border-blueberry bg-primary/100 text-white rounded hover:border-blueberry bg-rose-600"
								>
									Add Tier
								</button>
							</div>
						</div>
					)}

					{/* Other fields */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Cookie Duration (days)
						</label>
						<input
							type="number"
							min="1"
							max="365"
							value={formData.cookieDuration}
							onChange={(e) =>
								setFormData({
									...formData,
									cookieDuration: parseInt(e.target.value),
								})
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div className="space-y-3">
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={formData.approvalRequired}
								onChange={(e) =>
									setFormData({
										...formData,
										approvalRequired: e.target.checked,
									})
								}
								className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
							/>
							<span className="text-sm text-foreground">
								Require manual approval for partner applications
							</span>
						</label>

						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={formData.isPublic}
								onChange={(e) =>
									setFormData({ ...formData, isPublic: e.target.checked })
								}
								className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
							/>
							<span className="text-sm text-foreground">
								Make campaign publicly visible to all partners
							</span>
						</label>
					</div>

					{/* Buttons */}
					<div className="flex items-center gap-3 pt-6 border-t border-border">
						<button
							type="submit"
							disabled={isCreating}
							className="flex-1 border border-blueberry bg-primary/100 text-white px-6 py-3 rounded-lg hover:border-blueberry bg-primary transition font-medium disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{isCreating ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									Creating...
								</>
							) : (
								"Create Campaign"
							)}
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={isCreating}
							className="flex-1 border border-border px-6 py-3 rounded-lg hover:bg-background transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function EditCampaignModal({
	campaignId,
	onClose,
	onSuccess,
}: {
	campaignId: number;
	onClose: () => void;
	onSuccess?: () => void;
}) {
	const { data: campaign, loading: campaignLoading } = useCampaignDetail(
		campaignId.toString()
	);
	const {
		mutate: updateVersion,
		loading: isUpdating,
		error: updateError,
	} = useCreateCampaignVersion();

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		destinationUrl: "",
		commissionType: "percentage" as CommissionType,
		commissionValue: "",
		cookieDuration: 30,
		approvalRequired: false,
		isPublic: true,
		tiers: [] as Tier[],
	});

	// Pre-populate form when campaign loads
	useEffect(() => {
		if (campaign?.current_version) {
			const version = campaign.current_version;
			setFormData({
				name: version.name || "",
				description: version.description || "",
				destinationUrl: version.destination_url || "",
				commissionType: version.default_commission_type as CommissionType,
				commissionValue: version.default_commission_value?.toString() || "",
				cookieDuration: version.cookie_duration_days || 30,
				approvalRequired: version.approval_required || false,
				isPublic: version.is_public ?? true,
				tiers: (version.tiers || []).map((tier: any, idx: number) => ({
					id: idx,
					min: tier.min_amount,
					max: tier.max_amount,
					rewardType: tier.reward_type as "flat" | "percentage",
					rewardValue: tier.reward_value,
				})),
			});
		}
	}, [campaign]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const payload = {
				name: formData.name,
				description: formData.description,
				destination_url: formData.destinationUrl,
				default_commission_type: formData.commissionType,
				default_commission_value:
					formData.commissionType === "tiered"
						? null
						: parseFloat(formData.commissionValue),
				cookie_duration_days: formData.cookieDuration,
				approval_required: formData.approvalRequired,
				is_public: formData.isPublic,
				...(formData.commissionType === "tiered" && {
					tiers: formData.tiers.map((tier, idx) => ({
						label: `Tier ${idx + 1}`,
						min_amount: Number(tier.min),
						max_amount: Number(tier.max) || 999999,
						reward_type: tier.rewardType,
						reward_value: Number(tier.rewardValue),
					})),
				}),
			};

			await updateVersion({
				campaignId: campaignId,
				data: payload,
			});

			// Success - call the onSuccess callback and close modal
			onSuccess?.();
			onClose();
		} catch (error) {
			console.error("Failed to update campaign version:", error);
		}
	};

	const addTier = () => {
		setFormData((prev) => ({
			...prev,
			tiers: [
				...prev.tiers,
				{
					id: Date.now(),
					min: 0,
					max: undefined,
					rewardType: "percentage",
					rewardValue: 0,
				},
			],
		}));
	};

	const updateTier = (id: number, key: keyof Tier, value: any) => {
		setFormData((prev) => ({
			...prev,
			tiers: prev.tiers.map((t) => (t.id === id ? { ...t, [key]: value } : t)),
		}));
	};

	const removeTier = (id: number) => {
		setFormData((prev) => ({
			...prev,
			tiers: prev.tiers.filter((t) => t.id !== id),
		}));
	};

	if (campaignLoading) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
				<div className="bg-background rounded-lg p-8">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground text-center">
						Loading campaign...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black/50  flex items-center justify-center p-4 z-50">
			<div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-border">
					<h2 className="text-2xl font-bold text-foreground">
						Edit Campaign - Create New Version
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Creating a new version preserves the campaign history
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Error message */}
					{updateError && (
						<div className="flex items-center gap-3 p-4 bg-destructive/10 border border-red-200 rounded-lg">
							<AlertCircle
								size={20}
								className="text-destructive flex-shrink-0"
							/>
							<div>
								<h3 className="font-medium text-red-900">
									Error updating campaign
								</h3>
								<p className="text-sm text-red-700 mt-1">
									{updateError.message}
								</p>
							</div>
						</div>
					)}

					{/* Basic fields */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Campaign Name *
						</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Description
						</label>
						<textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={3}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Destination URL *
						</label>
						<input
							type="url"
							required
							value={formData.destinationUrl}
							onChange={(e) =>
								setFormData({ ...formData, destinationUrl: e.target.value })
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
							placeholder="https://yoursite.com/signup"
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Use {"{partner_id}"} as a placeholder for the partner ID
						</p>
					</div>

					{/* Commission Type */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Commission Type *
						</label>
						<select
							value={formData.commissionType}
							onChange={(e) =>
								setFormData({
									...formData,
									commissionType: e.target.value as CommissionType,
									commissionValue: "",
									tiers: [],
								})
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							<option value="percentage">Percentage</option>
							<option value="flat">Flat Amount</option>
							<option value="tiered">Tiered</option>
						</select>
					</div>

					{/* Single Commission Value */}
					{formData.commissionType !== "tiered" && (
						<div className="mt-4">
							<label className="block text-sm font-medium text-foreground mb-2">
								Commission Value *
							</label>
							<div className="relative">
								{formData.commissionType === "percentage" && (
									<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
										%
									</span>
								)}
								{formData.commissionType === "flat" && (
									<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
										$
									</span>
								)}
								<input
									type="number"
									required
									min="0"
									step="0.01"
									value={formData.commissionValue}
									onChange={(e) =>
										setFormData({
											...formData,
											commissionValue: e.target.value,
										})
									}
									className={`w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
										formData.commissionType === "flat" ? "pl-8" : "pr-8"
									}`}
								/>
							</div>
						</div>
					)}

					{/* Tiered Commission */}
					{formData.commissionType === "tiered" && (
						<div className="mt-4">
							<h3 className="text-sm font-medium text-foreground mb-2">
								Tiers
							</h3>
							<div className="space-y-3">
								{formData.tiers.map((tier) => (
									<div
										key={tier.id}
										className="grid grid-cols-5 gap-2 items-center"
									>
										<input
											type="number"
											title="Minimum number of conversions to qualify for tier"
											min={0}
											value={tier.min}
											onChange={(e) =>
												updateTier(tier.id, "min", parseFloat(e.target.value))
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Min"
										/>
										<input
											title="Maximum number of conversions covered in the tier"
											type="number"
											min={0}
											value={tier.max ?? ""}
											onChange={(e) =>
												updateTier(
													tier.id,
													"max",
													e.target.value === ""
														? undefined
														: parseFloat(e.target.value)
												)
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Max"
										/>
										<input
											type="number"
											title="Reward Value"
											min={0}
											step={0.01}
											value={tier.rewardValue}
											onChange={(e) =>
												updateTier(
													tier.id,
													"rewardValue",
													parseFloat(e.target.value)
												)
											}
											className="w-full px-2 py-1 border border-border rounded"
											placeholder="Reward"
										/>
										<select
											value={tier.rewardType}
											onChange={(e) =>
												updateTier(tier.id, "rewardType", e.target.value)
											}
											className="w-full px-2 py-1 border border-border rounded"
										>
											<option value="percentage">%</option>
											<option value="flat">$</option>
										</select>
										<button
											type="button"
											onClick={() => removeTier(tier.id)}
											className="text-red-500 px-2 py-1 border border-red-500 rounded border border-blueberry hover:bg-destructive/10"
										>
											Remove
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={addTier}
									className="mt-2 px-3 py-2 border border-blueberry bg-primary/100 text-white rounded hover:border-blueberry bg-rose-600"
								>
									Add Tier
								</button>
							</div>
						</div>
					)}

					{/* Other fields */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Cookie Duration (days)
						</label>
						<input
							type="number"
							min="1"
							max="365"
							value={formData.cookieDuration}
							onChange={(e) =>
								setFormData({
									...formData,
									cookieDuration: parseInt(e.target.value),
								})
							}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>

					<div className="space-y-3">
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={formData.approvalRequired}
								onChange={(e) =>
									setFormData({
										...formData,
										approvalRequired: e.target.checked,
									})
								}
								className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
							/>
							<span className="text-sm text-foreground">
								Require manual approval for partner applications
							</span>
						</label>

						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={formData.isPublic}
								onChange={(e) =>
									setFormData({ ...formData, isPublic: e.target.checked })
								}
								className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
							/>
							<span className="text-sm text-foreground">
								Make campaign publicly visible to all partners
							</span>
						</label>
					</div>

					{/* Buttons */}
					<div className="flex items-center gap-3 pt-6 border-t border-border">
						<button
							type="submit"
							disabled={isUpdating}
							className="flex-1 border border-blueberry bg-primary/100 text-white px-6 py-3 rounded-lg hover:border-blueberry bg-rose-600 transition font-medium disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{isUpdating ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									Updating...
								</>
							) : (
								"Create New Version"
							)}
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={isUpdating}
							className="flex-1 border border-border px-6 py-3 rounded-lg hover:bg-background transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
