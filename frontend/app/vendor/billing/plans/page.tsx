"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, getAuthToken } from "@/lib/api-client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Check,
	X,
	AlertTriangle,
	Zap,
	TrendingUp,
	Lock,
	ChevronRight,
} from "lucide-react";

interface Plan {
	id: string;
	name: string;
	display_name: string;
	description?: string;
	base_price: string;
	gmv_percentage: string;
	billing_cycle: string;
}

interface Subscription {
	subscription_id: string;
	plan_id: string;
	status: string;
}

interface PricingCalculation {
	base_fee: number;
	gmv_amount: number;
	gmv_fee: number;
	estimated_total: number;
}

const PLAN_FEATURES: Record<string, string[]> = {
	FOUNDER: [
		"Up to $10K monthly GMV",
		"7.5% GMV fee",
		"Basic analytics",
		"Email support",
		"Monthly invoicing",
	],
	GROWTH: [
		"Up to $100K monthly GMV",
		"6.5% GMV fee",
		"Advanced analytics",
		"Priority email support",
		"Bi-weekly invoicing",
		"Custom integration support",
	],
	ENTERPRISE: [
		"Unlimited GMV",
		"5% GMV fee (negotiable)",
		"Real-time analytics",
		"24/7 dedicated support",
		"Real-time invoicing",
		"Custom integration",
		"SLA guarantee",
		"Dedicated account manager",
	],
};

export default function PlansPage() {
	const router = useRouter();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [currentSubscription, setCurrentSubscription] =
		useState<Subscription | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [gmvAmount, setGmvAmount] = useState(10000);
	const [calculation, setCalculation] = useState<PricingCalculation | null>(
		null
	);
	const [vendorId, setVendorId] = useState<string | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	useEffect(() => {
		calculatePricing();
	}, [gmvAmount, selectedPlan]);

	const loadData = async () => {
		try {
			setLoading(true);
			setError(null);
			const token = getAuthToken();

			// Get vendor ID
			const vendor = await apiClient.currentUser.getVendor(token || undefined);
			setVendorId(vendor.vendor_id);

			// Load plans and subscription
			const [plansData, subData] = await Promise.all([
				apiClient.billing.getPlans(token || undefined),
				apiClient.billing.getCurrentSubscription(
					vendor.vendor_id,
					token || undefined
				),
			]);

			setPlans(plansData.plans || []);
			setCurrentSubscription(subData);

			// Set first plan as selected
			if (plansData.plans && plansData.plans.length > 0) {
				setSelectedPlan(plansData.plans[0]);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load billing data";
			setError(errorMessage);
			console.error("Error loading data:", err);
		} finally {
			setLoading(false);
		}
	};

	const calculatePricing = () => {
		if (!selectedPlan) return;

		const basePrice = parseFloat(selectedPlan.base_price);
		const gmvPercentage = parseFloat(selectedPlan.gmv_percentage);
		const gmvFee = (gmvAmount * gmvPercentage) / 100;
		const total = basePrice + gmvFee;

		setCalculation({
			base_fee: basePrice,
			gmv_amount: gmvAmount,
			gmv_fee: gmvFee,
			estimated_total: total,
		});
	};

	const handleSelectPlan = (plan: Plan) => {
		if (plan.id === currentSubscription?.plan_id) {
			// Already on this plan
			return;
		}
		setSelectedPlan(plan);
		setShowConfirmDialog(true);
	};

	const handleConfirmChange = async () => {
		if (!selectedPlan || !vendorId) return;

		try {
			setIsProcessing(true);
			const token = getAuthToken();

			// Update subscription
			await apiClient.billing.updateSubscription(
				vendorId,
				selectedPlan.id,
				token || undefined
			);

			// Show success and redirect
			router.push("/vendor/billing?success=plan_changed");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to change plan";
			setError(errorMessage);
			console.error("Error changing plan:", err);
		} finally {
			setIsProcessing(false);
			setShowConfirmDialog(false);
		}
	};

	const isCurrentPlan = (planId: string) =>
		planId === currentSubscription?.plan_id;

	return (
		<div className="min-h-screen bg-gradient-to-br from-background to-muted">
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Choose Your Plan
					</h1>
					<p className="text-muted-foreground">
						Select the perfect plan for your business. Upgrade or downgrade
						anytime.
					</p>
				</div>

				{/* Error Alert */}
				{error && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-96" />
						))}
					</div>
				) : (
					<div className="space-y-8">
						{/* Pricing Calculator Section */}
						<Card className="bg-background border-2 border-border">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
								<CardTitle className="flex items-center gap-2">
									<Zap className="h-5 w-5 text-primary" />
									Pricing Calculator
								</CardTitle>
								<CardDescription>
									Estimate your monthly costs based on your expected GMV
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="space-y-6">
									{/* GMV Input */}
									<div>
										<label className="block text-sm font-semibold text-foreground mb-2">
											Expected Monthly GMV
										</label>
										<div className="relative">
											<span className="absolute left-3 top-3 text-muted-foreground">
												$
											</span>
											<input
												type="number"
												value={gmvAmount}
												onChange={(e) =>
													setGmvAmount(
														Math.max(0, parseInt(e.target.value) || 0)
													)
												}
												className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
												placeholder="10000"
											/>
										</div>
										<div className="mt-2 flex gap-2">
											{[10000, 50000, 100000, 500000].map((amount) => (
												<button
													key={amount}
													onClick={() => setGmvAmount(amount)}
													className="px-3 py-1 text-xs font-medium rounded bg-muted text-foreground hover:bg-slate-200 transition"
												>
													${(amount / 1000).toFixed(0)}K
												</button>
											))}
										</div>
									</div>

									{/* Calculation Results */}
									{selectedPlan && calculation && (
										<div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
											<div className="bg-background rounded-lg p-4">
												<p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
													Base Fee
												</p>
												<p className="text-2xl font-bold text-foreground">
													${calculation.base_fee.toFixed(2)}
												</p>
											</div>

											<div className="bg-background rounded-lg p-4">
												<p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
													GMV Amount
												</p>
												<p className="text-2xl font-bold text-foreground">
													${calculation.gmv_amount.toLocaleString()}
												</p>
											</div>

											<div className="bg-background rounded-lg p-4">
												<p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
													GMV Fee ({selectedPlan.gmv_percentage}%)
												</p>
												<p className="text-2xl font-bold text-foreground">
													${calculation.gmv_fee.toFixed(2)}
												</p>
											</div>

											<div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-border">
												<p className="text-xs text-primary uppercase font-semibold mb-1">
													Estimated Total
												</p>
												<p className="text-2xl font-bold text-primary">
													${calculation.estimated_total.toFixed(2)}
												</p>
												<p className="text-xs text-primary mt-1">/month</p>
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Plans Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{plans.map((plan) => {
								const isCurrent = isCurrentPlan(plan.id);
								const isSelected = selectedPlan?.id === plan.id;

								return (
									<Card
										key={plan.id}
										className={`relative transition-all duration-300 ${
											isCurrent
												? "ring-2 ring-green-500 border-green-200 bg-secondary"
												: isSelected
												? "ring-2 ring-purple-500 border-border bg-primary/10"
												: "hover:shadow-lg"
										}`}
									>
										{/* Current Plan Badge */}
										{isCurrent && (
											<div className="absolute -top-3 right-4 bg-secondary0 text-white px-3 py-1 rounded-full text-xs font-semibold">
												Current Plan
											</div>
										)}

										<CardHeader>
											<div className="flex items-start justify-between">
												<div>
													<CardTitle className="text-xl">
														{plan.display_name}
													</CardTitle>
													<CardDescription className="mt-1">
														{plan.description ||
															"Perfect for growing businesses"}
													</CardDescription>
												</div>
												<Zap className="h-5 w-5 text-amber-500 flex-shrink-0" />
											</div>
										</CardHeader>

										<CardContent className="space-y-6">
											{/* Pricing */}
											<div>
												<div className="flex items-baseline gap-1">
													<span className="text-3xl font-bold text-foreground">
														${parseFloat(plan.base_price).toFixed(0)}
													</span>
													<span className="text-muted-foreground">/month</span>
												</div>
												<p className="text-sm text-muted-foreground mt-1">
													Plus {plan.gmv_percentage}% of GMV
												</p>
											</div>

											{/* Features */}
											<div className="space-y-3">
												<p className="text-sm font-semibold text-foreground">
													Key Features:
												</p>
												<ul className="space-y-2">
													{(PLAN_FEATURES[plan.name] || []).map(
														(feature, idx) => (
															<li
																key={idx}
																className="flex items-start gap-2 text-sm"
															>
																<Check className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
																<span className="text-foreground">
																	{feature}
																</span>
															</li>
														)
													)}
												</ul>
											</div>

											{/* Action Button */}
											<div className="pt-4 border-t space-y-2">
												{isCurrent ? (
													<Button disabled className="w-full" variant="outline">
														<Check className="h-4 w-4 mr-2" />
														Current Plan
													</Button>
												) : (
													<Button
														onClick={() => handleSelectPlan(plan)}
														className="w-full"
														variant={isSelected ? "default" : "outline"}
													>
														{isSelected ? "Confirm Plan" : "Select Plan"}
														<ChevronRight className="h-4 w-4 ml-2" />
													</Button>
												)}
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>

						{/* Feature Comparison */}
						<Card>
							<CardHeader className="bg-gradient-to-r from-background to-muted">
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="h-5 w-5 text-muted-foreground" />
									Feature Comparison
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b-2 border-border">
												<th className="text-left py-3 px-4 font-semibold text-foreground">
													Feature
												</th>
												{plans.map((plan) => (
													<th
														key={plan.id}
														className="text-center py-3 px-4 font-semibold text-foreground"
													>
														{plan.display_name}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y">
											<tr>
												<td className="py-3 px-4 font-semibold text-foreground">
													Base Price
												</td>
												{plans.map((plan) => (
													<td key={plan.id} className="text-center py-3 px-4">
														${parseFloat(plan.base_price).toFixed(0)}/mo
													</td>
												))}
											</tr>

											<tr>
												<td className="py-3 px-4 font-semibold text-foreground">
													GMV Fee
												</td>
												{plans.map((plan) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{plan.gmv_percentage}%
													</td>
												))}
											</tr>

											<tr className="bg-background">
												<td className="py-3 px-4 font-semibold text-foreground">
													Analytics
												</td>
												{plans.map((plan, idx) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{idx === plans.length - 1 ? (
															<span className="text-foreground font-semibold">
																Real-time
															</span>
														) : idx === 0 ? (
															<span className="text-muted-foreground">Basic</span>
														) : (
															<span className="text-muted-foreground">Advanced</span>
														)}
													</td>
												))}
											</tr>

											<tr>
												<td className="py-3 px-4 font-semibold text-foreground">
													Support
												</td>
												{plans.map((plan, idx) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{idx === plans.length - 1 ? (
															<span className="text-foreground font-semibold">
																24/7
															</span>
														) : idx <= 1 ? (
															<span className="text-muted-foreground">Email</span>
														) : (
															<span className="text-muted-foreground">Priority</span>
														)}
													</td>
												))}
											</tr>

											<tr className="bg-background">
												<td className="py-3 px-4 font-semibold text-foreground">
													Custom Integration
												</td>
												{plans.map((plan, idx) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{idx === 0 ? (
															<X className="h-5 w-5 text-muted-foreground mx-auto" />
														) : (
															<Check className="h-5 w-5 text-secondary mx-auto" />
														)}
													</td>
												))}
											</tr>

											<tr>
												<td className="py-3 px-4 font-semibold text-foreground">
													Dedicated Support
												</td>
												{plans.map((plan, idx) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{idx === plans.length - 1 ? (
															<Check className="h-5 w-5 text-secondary mx-auto" />
														) : (
															<X className="h-5 w-5 text-muted-foreground mx-auto" />
														)}
													</td>
												))}
											</tr>

											<tr className="bg-background">
												<td className="py-3 px-4 font-semibold text-foreground">
													SLA
												</td>
												{plans.map((plan, idx) => (
													<td key={plan.id} className="text-center py-3 px-4">
														{idx === plans.length - 1 ? (
															<Check className="h-5 w-5 text-secondary mx-auto" />
														) : (
															<X className="h-5 w-5 text-muted-foreground mx-auto" />
														)}
													</td>
												))}
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>

						{/* Info Banner */}
						<Alert className="bg-primary/10 border-border">
							<Lock className="h-4 w-4 text-primary" />
							<AlertTitle>Billing Changes</AlertTitle>
							<AlertDescription>
								Plan changes take effect immediately. Pricing is prorated based
								on your billing cycle. You can change your plan anytime with no
								penalties.
							</AlertDescription>
						</Alert>
					</div>
				)}
			</div>

			{/* Confirmation Dialog */}
			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Subscription Plan?</DialogTitle>
						<DialogDescription>
							You're about to change your plan to{" "}
							<span className="font-semibold">
								{selectedPlan?.display_name}
							</span>
							. This change will take effect immediately.
						</DialogDescription>
					</DialogHeader>

					{selectedPlan && calculation && (
						<div className="space-y-4">
							<div className="bg-background rounded-lg p-4 space-y-2">
								<div className="flex justify-between">
									<span className="text-muted-foreground">New Base Price:</span>
									<span className="font-semibold text-foreground">
										${calculation.base_fee.toFixed(2)}/mo
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										GMV Fee ({selectedPlan.gmv_percentage}%):
									</span>
									<span className="font-semibold text-foreground">
										${calculation.gmv_fee.toFixed(2)} (estimated)
									</span>
								</div>
								<div className="flex justify-between pt-2 border-t">
									<span className="text-foreground font-semibold">
										Estimated Monthly:
									</span>
									<span className="text-lg font-bold text-primary">
										${calculation.estimated_total.toFixed(2)}
									</span>
								</div>
							</div>

							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									Your billing will be prorated for the remainder of your
									current billing cycle.
								</AlertDescription>
							</Alert>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowConfirmDialog(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleConfirmChange} disabled={isProcessing}>
							{isProcessing ? "Processing..." : "Confirm Change"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
