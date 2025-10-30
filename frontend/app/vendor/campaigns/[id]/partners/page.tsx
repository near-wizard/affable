"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
	ArrowLeft,
	Search,
	Users,
	Mail,
	TrendingUp,
	DollarSign,
	Trash2,
	MoreVertical,
	CheckCircle,
	Clock,
	Filter,
	Download,
	Edit2,
	Save,
	X,
} from "lucide-react";
import { useCampaignPartners, useCampaignDetail } from "@/hooks/use-api";
import {
	GridSkeleton,
	ErrorBoundary,
	EmptyState,
} from "@/components/loading-skeleton";
import { apiClient } from "@/lib/api-client";

interface CommissionOverride {
	partner_id: number;
	commission_type: "percentage" | "flat";
	commission_value: number;
	notes?: string;
}

interface EditingPartner {
	partner_id: number;
	commission_type: "percentage" | "flat";
	commission_value: number;
	notes?: string;
}

export default function ManageCampaignPartnersPage() {
	const params = useParams();
	const router = useRouter();
	const campaignId = params.id as string;

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [editingPartner, setEditingPartner] = useState<EditingPartner | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPartners, setSelectedPartners] = useState<Set<number>>(new Set());
	const [isProcessing, setIsProcessing] = useState(false);
	const [refetchTrigger, setRefetchTrigger] = useState(0);

	// Fetch campaign details and partners
	const { data: campaign, loading: campaignLoading } = useCampaignDetail(campaignId);
	const { data: partnersResponse, loading: partnersLoading, error: partnersError } = useCampaignPartners(campaignId, {
		page: 1,
		limit: 100,
	});

	const partners = partnersResponse?.data || [];

	if (partnersError) {
		return <ErrorBoundary error={partnersError.message} />;
	}

	if (campaignLoading || partnersLoading) {
		return <GridSkeleton columns={5} items={6} />;
	}

	if (!campaign) {
		return <EmptyState title="Campaign not found" description="The campaign you're looking for doesn't exist." />;
	}

	const handleEditCommission = (partner: any) => {
		setEditingPartner({
			partner_id: partner.partner_id,
			commission_type: campaign.commission_type || "percentage",
			commission_value: campaign.commission_value || 0,
			notes: "",
		});
		setError(null);
	};

	const handleSaveCommissionOverride = async () => {
		if (!editingPartner) return;

		setSaving(true);
		setError(null);

		try {
			await apiClient.campaigns.setPartnerCommissionOverride(
				parseInt(campaignId),
				editingPartner.partner_id,
				{
					commission_type: editingPartner.commission_type,
					commission_value: editingPartner.commission_value,
					notes: editingPartner.notes,
				}
			);
			setEditingPartner(null);
			// In a real app, you'd refetch partners here
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save commission override");
		} finally {
			setSaving(false);
		}
	};

	const handleApprovePartner = async (partnerId: number) => {
		setError(null);
		setSuccessMessage(null);
		setIsProcessing(true);

		try {
			const partner = partners.find(p => p.partner_id === partnerId);
			await apiClient.campaigns.approvePartner(
				parseInt(campaignId),
				partnerId,
				{ approved: true }
			);
			setSuccessMessage(`${partner?.partner_name} has been approved!`);
			// Trigger refetch
			setRefetchTrigger(prev => prev + 1);
			// Clear selection
			setSelectedPartners(prev => {
				const newSet = new Set(prev);
				newSet.delete(partnerId);
				return newSet;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to approve partner");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleRejectPartner = async (partnerId: number) => {
		setError(null);
		setSuccessMessage(null);
		setIsProcessing(true);

		try {
			const partner = partners.find(p => p.partner_id === partnerId);
			await apiClient.campaigns.approvePartner(
				parseInt(campaignId),
				partnerId,
				{ approved: false, rejection_reason: "Not approved by vendor" }
			);
			setSuccessMessage(`${partner?.partner_name} has been rejected!`);
			// Trigger refetch
			setRefetchTrigger(prev => prev + 1);
			// Clear selection
			setSelectedPartners(prev => {
				const newSet = new Set(prev);
				newSet.delete(partnerId);
				return newSet;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to reject partner");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleBulkApprove = async () => {
		if (selectedPartners.size === 0) return;

		setError(null);
		setSuccessMessage(null);
		setIsProcessing(true);

		let successCount = 0;
		let failureCount = 0;

		for (const partnerId of Array.from(selectedPartners)) {
			try {
				await apiClient.campaigns.approvePartner(
					parseInt(campaignId),
					partnerId,
					{ approved: true }
				);
				successCount++;
			} catch (err) {
				failureCount++;
			}
		}

		if (successCount > 0) {
			setSuccessMessage(`${successCount} partner${successCount > 1 ? 's' : ''} approved!`);
			setRefetchTrigger(prev => prev + 1);
			setSelectedPartners(new Set());
		}
		if (failureCount > 0) {
			setError(`Failed to approve ${failureCount} partner${failureCount > 1 ? 's' : ''}`);
		}

		setIsProcessing(false);
	};

	const handleBulkReject = async () => {
		if (selectedPartners.size === 0) return;

		setError(null);
		setSuccessMessage(null);
		setIsProcessing(true);

		let successCount = 0;
		let failureCount = 0;

		for (const partnerId of Array.from(selectedPartners)) {
			try {
				await apiClient.campaigns.approvePartner(
					parseInt(campaignId),
					partnerId,
					{ approved: false, rejection_reason: "Not approved by vendor" }
				);
				successCount++;
			} catch (err) {
				failureCount++;
			}
		}

		if (successCount > 0) {
			setSuccessMessage(`${successCount} partner${successCount > 1 ? 's' : ''} rejected!`);
			setRefetchTrigger(prev => prev + 1);
			setSelectedPartners(new Set());
		}
		if (failureCount > 0) {
			setError(`Failed to reject ${failureCount} partner${failureCount > 1 ? 's' : ''}`);
		}

		setIsProcessing(false);
	};

	const togglePartnerSelection = (partnerId: number) => {
		setSelectedPartners(prev => {
			const newSet = new Set(prev);
			if (newSet.has(partnerId)) {
				newSet.delete(partnerId);
			} else {
				newSet.add(partnerId);
			}
			return newSet;
		});
	};

	const toggleSelectAll = () => {
		if (selectedPartners.size === filteredPartners.length) {
			setSelectedPartners(new Set());
		} else {
			setSelectedPartners(new Set(filteredPartners.map(p => p.partner_id)));
		}
	};

	const pendingPartners = partners.filter(p => p.status === 'pending');

	const filteredPartners = partners
		.filter((p) => {
			const matchesSearch =
				p.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
				p.partner_email?.toLowerCase().includes(search.toLowerCase());

			const matchesStatus = statusFilter === "all" || p.status === statusFilter;

			return matchesSearch && matchesStatus;
		})
		.sort((a, b) => {
			if (!sortColumn) return 0;

			let aValue: any = (a as any)[sortColumn];
			let bValue: any = (b as any)[sortColumn];

			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
			}

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}

			return 0;
		});

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection("asc");
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800";
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "inactive":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-muted text-foreground";
		}
	};

	const approvedCount = partners.filter((p) => p.status === "approved").length;
	const pendingCount = partners.filter((p) => p.status === "pending").length;
	const totalCommissions = partners.reduce((sum, p) => sum + (p.total_commission_earned || 0), 0);
	const conversionRate =
		partners.length > 0
			? (
					(partners.filter((p) => p.total_conversions && p.total_conversions > 0).length /
						partners.length) *
					100
			  ).toFixed(1)
			: "0";

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
							<h1 className="text-3xl font-bold text-foreground">Manage Partners</h1>
							<p className="text-muted-foreground mt-1">{campaign.name}</p>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
						<div className="bg-card rounded-lg p-4 border border-border">
							<span className="text-sm text-muted-foreground">Total Partners</span>
							<p className="text-2xl font-bold text-foreground mt-2">{partners.length}</p>
						</div>
						<div className="bg-card rounded-lg p-4 border border-border">
							<span className="text-sm text-muted-foreground">Approved Partners</span>
							<p className="text-2xl font-bold text-green-600 mt-2">{approvedCount}</p>
						</div>
						<div className="bg-card rounded-lg p-4 border border-border">
							<span className="text-sm text-muted-foreground">Total Commissions Earned</span>
							<p className="text-2xl font-bold text-primary mt-2">${totalCommissions.toLocaleString()}</p>
						</div>
						<div className="bg-card rounded-lg p-4 border border-border">
							<span className="text-sm text-muted-foreground">Conversion Rate</span>
							<p className="text-2xl font-bold text-accent mt-2">{conversionRate}%</p>
						</div>
					</div>
					{error && (
						<div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-800">{error}</p>
						</div>
					)}
				{successMessage && (
					<div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-green-800">{successMessage}</p>
					</div>
				)}
				</div>
			</div>

			{/* Controls */}
			<div className="bg-background border-b border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex flex-col md:flex-row gap-4 items-center">
						{/* Search */}
						<div className="relative flex-1">
							<Search
								className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
								size={20}
							/>
							<input
								type="text"
								placeholder="Search partners by name or email..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
							/>
						</div>

						{/* Filters */}
						<div className="flex gap-2">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as any)}
								className="px-4 py-2 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary"
							>
								<option value="all">All Statuses</option>
								<option value="approved">Approved</option>
								<option value="pending">Pending</option>
								<option value="rejected">Rejected</option>
							</select>

							<button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition">
								<Download size={16} />
								<span className="hidden sm:inline">Export</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Bulk Actions Bar */}
			{selectedPartners.size > 0 && pendingPartners.length > 0 && (
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-blue-50 border-b border-blue-200 sticky top-0 z-10">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-blue-900">
							{selectedPartners.size} partner{selectedPartners.size > 1 ? 's' : ''} selected
						</span>
						<div className="flex gap-2">
							<button
								onClick={handleBulkApprove}
								disabled={isProcessing}
								className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
							>
								{isProcessing ? "Processing..." : "Approve Selected"}
							</button>
							<button
								onClick={handleBulkReject}
								disabled={isProcessing}
								className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
							>
								{isProcessing ? "Processing..." : "Reject Selected"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Partners Table */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{filteredPartners.length === 0 ? (
					<EmptyState
						title="No partners found"
						description={
							search || statusFilter !== "all"
								? "Try adjusting your filters or search terms."
								: "No partners have enrolled in this campaign yet."
						}
					/>
				) : (
					<div className="overflow-x-auto bg-background rounded-lg shadow">
						<table className="min-w-full divide-y divide-gray-200">
							<thead>
								<tr>
									{pendingPartners.length > 0 && (
										<th className="px-4 py-3 text-left">
											<input
												type="checkbox"
												checked={selectedPartners.size === filteredPartners.length && filteredPartners.length > 0}
												onChange={toggleSelectAll}
												className="w-4 h-4 rounded border-border text-primary"
											/>
										</th>
									)}
									{[
										{ key: "partner_name", label: "Partner" },
										{ key: "status", label: "Status" },
										{ key: "total_clicks", label: "Clicks" },
										{ key: "total_conversions", label: "Conversions" },
										{ key: "total_commission_earned", label: "Commission" },
										{ key: "applied_at", label: "Joined" },
									].map((col) => (
										<th
											key={col.key}
											onClick={() => handleSort(col.key)}
											className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/50"
										>
											<div className="flex items-center gap-2">
												<span>{col.label}</span>
												{sortColumn === col.key && (
													<span className="text-primary text-xs">
														{sortDirection === "asc" ? "↑" : "↓"}
													</span>
												)}
											</div>
										</th>
									))}
									<th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{filteredPartners.map((partner) => (
									<tr key={partner.campaign_partner_id} className="hover:bg-muted/30 transition">
										{partner.status === 'pending' && (
											<td className="px-4 py-4">
												<input
													type="checkbox"
													checked={selectedPartners.has(partner.partner_id)}
													onChange={() => togglePartnerSelection(partner.partner_id)}
													className="w-4 h-4 rounded border-border text-primary cursor-pointer"
												/>
											</td>
										)}
										<td className="px-4 py-4">
											<div>
												<p className="font-medium text-foreground">{partner.partner_name || "Unknown"}</p>
												<p className="text-sm text-muted-foreground">{partner.partner_email || "No email"}</p>
											</div>
										</td>
										<td className="px-4 py-4">
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
													partner.status || "pending"
												)}`}
											>
												{partner.status ? partner.status.charAt(0).toUpperCase() + partner.status.slice(1) : "Unknown"}
											</span>
										</td>
										<td className="px-4 py-4 text-foreground">
											<div className="flex items-center gap-2">
												<span>{(partner.total_clicks || 0).toLocaleString()}</span>
											</div>
										</td>
										<td className="px-4 py-4 text-foreground">
											<div className="flex items-center gap-2">
												<TrendingUp size={14} className="text-secondary" />
												<span>{partner.total_conversions || 0}</span>
											</div>
										</td>
										<td className="px-4 py-4 font-semibold text-primary">
											${(partner.total_commission_earned || 0).toLocaleString()}
										</td>
										<td className="px-4 py-4 text-sm text-muted-foreground">
											{partner.applied_at ? new Date(partner.applied_at).toLocaleDateString() : "-"}
										</td>
										<td className="px-4 py-4">
											<div className="flex items-center gap-2">
												{partner.status === "pending" && (
													<>
														<button
															onClick={() => handleApprovePartner(partner.partner_id)}
															className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition"
														>
															Approve
														</button>
														<button
															onClick={() => handleRejectPartner(partner.partner_id)}
															className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
														>
															Reject
														</button>
													</>
												)}
												<button
													onClick={() => handleEditCommission(partner)}
													className="p-2 hover:bg-muted rounded-lg transition"
												>
													<Edit2 size={16} className="text-muted-foreground" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Commission Override Modal */}
				{editingPartner && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 border border-border">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-bold text-foreground">Edit Commission Override</h3>
								<button
									onClick={() => setEditingPartner(null)}
									className="p-1 hover:bg-muted rounded"
								>
									<X size={20} className="text-muted-foreground" />
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Commission Type
									</label>
									<select
										value={editingPartner.commission_type}
										onChange={(e) =>
											setEditingPartner({
												...editingPartner,
												commission_type: e.target.value as "percentage" | "flat",
											})
										}
										className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
									>
										<option value="percentage">Percentage</option>
										<option value="flat">Flat Rate</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Commission Value
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										value={editingPartner.commission_value}
										onChange={(e) =>
											setEditingPartner({
												...editingPartner,
												commission_value: parseFloat(e.target.value),
											})
										}
										className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
										placeholder="0.00"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Notes
									</label>
									<textarea
										value={editingPartner.notes || ""}
										onChange={(e) =>
											setEditingPartner({
												...editingPartner,
												notes: e.target.value,
											})
										}
										className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
										placeholder="Enter any notes about this override..."
										rows={3}
									/>
								</div>

								<div className="flex gap-2 justify-end pt-4 border-t border-border">
									<button
										onClick={() => setEditingPartner(null)}
										className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition text-foreground"
									>
										Cancel
									</button>
									<button
										onClick={handleSaveCommissionOverride}
										disabled={saving}
										className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
									>
										{saving ? "Saving..." : "Save"}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
