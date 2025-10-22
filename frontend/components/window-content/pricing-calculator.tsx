"use client";

import { useState, useMemo } from "react";

type CommissionType = "fixed" | "percentage" | "tiered";
type InputMode = "products" | "gmv";

interface Product {
	id: string;
	name: string;
	price: number;
	unitsSold: number;
}

interface TierConfig {
	minGMV: number;
	maxGMV: number;
	commissionType: CommissionType;
	commissionValue: number;
}

interface PlanConfig {
	name: string;
	monthlyFee: number;
	performanceFeePercentage: number;
	description: string;
}

const PLANS: Record<string, PlanConfig> = {
	beta: {
		name: "Beta",
		monthlyFee: 0,
		performanceFeePercentage: 10,
		description: "10% of GMV",
	},
	bootstrap: {
		name: "Bootstrap",
		monthlyFee: 200,
		performanceFeePercentage: 8,
		description: "8% of GMV",
	},
	accelerator: {
		name: "Accelerator",
		monthlyFee: 2000,
		performanceFeePercentage: 5,
		description: "5% of GMV",
	},
};

export function PricingCalculator() {
	const [selectedPlan, setSelectedPlan] = useState<string>("beta");
	const [inputMode, setInputMode] = useState<InputMode>("products");
	const [directGMV, setDirectGMV] = useState<number>(10000);
	const [unitsSoldForFixedPayout, setUnitsSoldForFixedPayout] = useState<number>(100);
	const [products, setProducts] = useState<Product[]>([
		{ id: "1", name: "Product A", price: 100, unitsSold: 50 },
		{ id: "2", name: "Product B", price: 75, unitsSold: 30 },
	]);
	const [commissionType, setCommissionType] =
		useState<CommissionType>("percentage");
	const [commissionValue, setCommissionValue] = useState<number>(15);
	const [tiers, setTiers] = useState<TierConfig[]>([
		{
			minGMV: 0,
			maxGMV: 50000,
			commissionType: "percentage",
			commissionValue: 15,
		},
		{
			minGMV: 50001,
			maxGMV: 100000,
			commissionType: "percentage",
			commissionValue: 12,
		},
		{
			minGMV: 100001,
			maxGMV: Infinity,
			commissionType: "percentage",
			commissionValue: 10,
		},
	]);

	const plan = PLANS[selectedPlan];

	// Calculate total GMV based on input mode
	const gmv = useMemo(() => {
		if (inputMode === "gmv") {
			return directGMV;
		}
		// Products mode
		return products.reduce((total, product) => {
			const productTotal = product.price * product.unitsSold;
			return total + (isNaN(productTotal) ? 0 : productTotal);
		}, 0);
	}, [inputMode, directGMV, products]);

	// Calculate affiliate payout
	const affiliatePayoutAmount = useMemo(() => {
		if (commissionType === "fixed") {
			// For fixed payout in GMV mode, multiply by units sold
			if (inputMode === "gmv") {
				return commissionValue * unitsSoldForFixedPayout;
			}
			// For products mode, fixed payout per unit applies to total units
			const totalUnitsSold = products.reduce((total, p) => total + p.unitsSold, 0);
			return commissionValue * totalUnitsSold;
		}

		if (commissionType === "percentage") {
			return (gmv * commissionValue) / 100;
		}

		// Tiered calculation
		let payout = 0;
		for (const tier of tiers) {
			if (gmv >= tier.minGMV && gmv <= tier.maxGMV) {
				if (tier.commissionType === "percentage") {
					payout = (gmv * tier.commissionValue) / 100;
				} else {
					payout = tier.commissionValue;
				}
				break;
			}
		}
		return payout;
	}, [gmv, commissionType, commissionValue, tiers, inputMode, unitsSoldForFixedPayout, products]);

	// Calculate fee components
	const monthlyFeeComponent = useMemo(() => {
		return plan.monthlyFee;
	}, [plan.monthlyFee]);

	const performanceFeeComponent = useMemo(() => {
		return (gmv * plan.performanceFeePercentage) / 100;
	}, [gmv, plan.performanceFeePercentage]);

	// Calculate platform fee (based on plan)
	const platformFee = useMemo(() => {
		return monthlyFeeComponent + performanceFeeComponent;
	}, [monthlyFeeComponent, performanceFeeComponent]);

	// Calculate your takehome
	const yourTakehome = useMemo(() => {
		return gmv - affiliatePayoutAmount - platformFee;
	}, [gmv, affiliatePayoutAmount, platformFee]);


	// Product management
	const handleProductChange = (
		id: string,
		field: keyof Product,
		value: string | number
	) => {
		setProducts(
			products.map((product) =>
				product.id === id
					? {
							...product,
							[field]:
								field === "name" ? value : Number(value) || 0,
						}
					: product
			)
		);
	};

	const addProduct = () => {
		const newId = Math.max(
			...products.map((p) => parseInt(p.id)),
			0
		) + 1;
		setProducts([
			...products,
			{
				id: newId.toString(),
				name: `Product ${String.fromCharCode(64 + products.length + 1)}`,
				price: 0,
				unitsSold: 0,
			},
		]);
	};

	const removeProduct = (id: string) => {
		if (products.length > 1) {
			setProducts(products.filter((product) => product.id !== id));
		}
	};

	const handleTierChange = (
		index: number,
		field: keyof TierConfig,
		value: number | CommissionType
	) => {
		const newTiers = [...tiers];
		newTiers[index] = { ...newTiers[index], [field]: value };
		setTiers(newTiers);
	};

	const addTier = () => {
		setTiers([
			...tiers,
			{
				minGMV: tiers[tiers.length - 1].maxGMV + 1,
				maxGMV: tiers[tiers.length - 1].maxGMV + 50000,
				commissionType: "percentage",
				commissionValue: 10,
			},
		]);
	};

	const removeTier = (index: number) => {
		if (tiers.length > 1) {
			setTiers(tiers.filter((_, i) => i !== index));
		}
	};

	return (
		<div className="bg-gradient-to-br from-muted/50 to-background border border-primary/20 rounded-2xl overflow-hidden shadow-xl">
			{/* Header with gradient background */}
			<div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/10">
				<h3 className="text-2xl font-bold text-foreground mb-2">
					Your Custom Pricing
				</h3>
				<p className="text-foreground/70">
					Configure your GMV and commission structure to see exact costs and profit margins
				</p>
			</div>

			<div className="p-8 space-y-8">
				{/* Plan Selection */}
				<div className="space-y-4">
					<label className="block text-sm font-semibold text-foreground">
						Select Plan
					</label>
					<div className="grid grid-cols-3 gap-3">
						{Object.entries(PLANS).map(([key, plan]) => (
							<button
								key={key}
								onClick={() => setSelectedPlan(key)}
								className={`p-4 rounded-lg border-2 transition-all duration-300 ${
									selectedPlan === key
										? "border-primary bg-primary/15 shadow-lg"
										: "border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
								}`}
							>
								<div className="font-semibold text-foreground text-sm">{plan.name}</div>
								<div className="text-xs text-foreground/60 mt-2">
									${plan.monthlyFee}/mo + {plan.performanceFeePercentage}%
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Input Mode Selection */}
				<div className="flex items-center justify-center gap-4 py-2">
					<button
						onClick={() => setInputMode("products")}
						className={`px-6 py-3 rounded-lg font-medium transition-all ${
							inputMode === "products"
								? "bg-primary text-primary-foreground shadow-lg"
								: "bg-muted text-foreground hover:bg-muted/80"
						}`}
					>
						By Individual Products
					</button>
					<div className="text-sm font-medium text-foreground/60">or</div>
					<button
						onClick={() => setInputMode("gmv")}
						className={`px-6 py-3 rounded-lg font-medium transition-all ${
							inputMode === "gmv"
								? "bg-primary text-primary-foreground shadow-lg"
								: "bg-muted text-foreground hover:bg-muted/80"
						}`}
					>
						By Total GMV
					</button>
				</div>

				{/* Products Section (conditionally shown) */}
				{inputMode === "products" && (
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="text-sm font-semibold text-foreground">
								Products
							</h4>
							<span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
								Total GMV: $
								{new Intl.NumberFormat("en-US").format(Math.round(gmv))}
							</span>
						</div>

						<div className="space-y-3 max-h-80 overflow-y-auto pr-2">
							{products.map((product, index) => (
								<div
									key={product.id}
									className="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-3 hover:border-primary/30 transition-colors"
								>
									<div className="grid grid-cols-3 gap-3 text-sm">
										<div>
											<label className="text-foreground/70 text-xs font-medium">Product Name</label>
											<input
												type="text"
												value={product.name}
												onChange={(e) =>
													handleProductChange(product.id, "name", e.target.value)
												}
												className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm mt-1 focus:outline-none focus:border-primary transition-colors"
												placeholder="e.g., Premium Plan"
											/>
										</div>
										<div>
											<label className="text-foreground/70 text-xs font-medium">Price ($)</label>
											<input
												type="number"
												value={product.price}
												onChange={(e) =>
													handleProductChange(product.id, "price", e.target.value)
												}
												className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm mt-1 focus:outline-none focus:border-primary transition-colors"
												placeholder="0.00"
												step="0.01"
											/>
										</div>
										<div>
											<label className="text-foreground/70 text-xs font-medium">Units Sold</label>
											<input
												type="number"
												value={product.unitsSold}
												onChange={(e) =>
													handleProductChange(product.id, "unitsSold", e.target.value)
												}
												className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm mt-1 focus:outline-none focus:border-primary transition-colors"
												placeholder="0"
											/>
										</div>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-semibold text-foreground bg-primary/5 px-3 py-1 rounded">
											Subtotal: $
											{new Intl.NumberFormat("en-US").format(
												Math.round(product.price * product.unitsSold)
											)}
										</span>
										{products.length > 1 && (
											<button
												onClick={() => removeProduct(product.id)}
												className="px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium"
											>
												Remove
											</button>
										)}
									</div>
								</div>
							))}
						</div>

						<button
							onClick={addProduct}
							className="w-full px-4 py-3 text-sm bg-primary/10 text-primary border border-primary/50 rounded-lg hover:bg-primary/20 transition-colors font-medium hover:border-primary/80"
						>
							+ Add Product
						</button>
					</div>
				)}

				{/* GMV Input Section (conditionally shown) */}
				{inputMode === "gmv" && (
					<div className="space-y-4">
						<div className="space-y-3">
							<label className="block text-sm font-semibold text-foreground">
								Total Gross Merchandise Value (GMV)
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 font-medium">$</span>
								<input
									type="number"
									value={directGMV}
									onChange={(e) => setDirectGMV(Number(e.target.value))}
									className="w-full pl-8 pr-3 py-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
									placeholder="Enter total GMV"
									step="100"
									min="0"
								/>
							</div>
							<p className="text-xs text-foreground/70">
								Enter the total Gross Merchandise Value generated from your partner sales.
							</p>
						</div>
					</div>
				)}

				{/* Commission Type Selection */}
				<div className="space-y-3">
					<label className="block text-sm font-semibold text-foreground">
						Affiliate Payout Type
					</label>
					<div className="grid grid-cols-3 gap-3">
						{(["fixed", "percentage", "tiered"] as const).map((type) => (
							<button
								key={type}
								onClick={() => setCommissionType(type)}
								className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
									commissionType === type
										? "bg-primary text-primary-foreground shadow-lg"
										: "bg-muted/30 text-foreground border border-border/50 hover:border-primary/50 hover:bg-muted/50"
								}`}
							>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</button>
						))}
					</div>
				</div>

				{/* Commission Configuration */}
				{commissionType === "fixed" && (
					<div className="space-y-4">
						<div className="bg-muted/20 border border-border/50 rounded-lg p-4 space-y-3">
							<label className="block text-sm font-semibold text-foreground">
								Fixed Payout {inputMode === "gmv" ? "Per Unit" : "Amount"}
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 font-medium">$</span>
								<input
									type="number"
									min="0"
									value={commissionValue}
									onChange={(e) => setCommissionValue(Number(e.target.value))}
									className="w-full pl-8 pr-3 py-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
									placeholder={inputMode === "gmv" ? "Enter payout per unit" : "Enter payout amount"}
									step="0.01"
								/>
							</div>
							<p className="text-xs text-foreground/70">
								{inputMode === "gmv"
									? "Enter the payout amount per unit sold."
									: "Enter the total fixed affiliate payout amount."}
							</p>
							<div className="text-sm font-semibold text-primary bg-primary/10 rounded px-3 py-2">
								Current Value: ${new Intl.NumberFormat("en-US").format(commissionValue)}
							</div>
						</div>

						{inputMode === "gmv" && (
							<div className="bg-muted/20 border border-border/50 rounded-lg p-4 space-y-3">
								<label className="block text-sm font-semibold text-foreground">
									Total Units Sold
								</label>
								<input
									type="number"
									min="0"
									value={unitsSoldForFixedPayout}
									onChange={(e) => setUnitsSoldForFixedPayout(Number(e.target.value))}
									className="w-full px-3 py-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
									placeholder="Enter total units sold"
									step="1"
								/>
								<p className="text-xs text-foreground/70">
									Total number of units sold.
								</p>
								<div className="text-sm font-semibold text-primary bg-primary/10 rounded px-3 py-2">
									Affiliate Payout: ${new Intl.NumberFormat("en-US").format(commissionValue)} x {unitsSoldForFixedPayout} = ${new Intl.NumberFormat("en-US").format(commissionValue * unitsSoldForFixedPayout)}
								</div>
							</div>
						)}
					</div>
				)}

				{commissionType === "percentage" && (
					<div className="bg-muted/20 border border-border/50 rounded-lg p-4 space-y-3">
						<label className="block text-sm font-semibold text-foreground">
							Commission Percentage
						</label>
						<div className="relative">
							<input
								type="number"
								min="0"
								max="100"
								value={commissionValue}
								onChange={(e) => setCommissionValue(Number(e.target.value))}
								className="w-full px-3 py-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
								placeholder="Enter percentage"
								step="0.1"
							/>
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 font-medium">%</span>
						</div>
						<div className="text-sm font-semibold text-primary bg-primary/10 rounded px-3 py-2">
							Commission Rate: {commissionValue}% of GMV
						</div>
					</div>
				)}

				{commissionType === "tiered" && (
					<div className="space-y-4">
						<h4 className="text-sm font-semibold text-foreground">Commission Tiers</h4>
						<div className="space-y-3 max-h-80 overflow-y-auto pr-2">
							{tiers.map((tier, index) => (
								<div key={index} className="p-4 bg-muted/30 border border-border/50 rounded-lg space-y-3 hover:border-primary/30 transition-colors">
									<div className="flex justify-between items-center mb-2">
										<span className="text-sm font-semibold text-foreground">Tier {index + 1}</span>
										{tiers.length > 1 && (
											<button
												onClick={() => removeTier(index)}
												className="px-3 py-1 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium"
											>
												Remove
											</button>
										)}
									</div>
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<label className="text-foreground/70 text-xs font-medium">Min GMV</label>
											<div className="relative mt-1">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">$</span>
												<input
													type="number"
													value={tier.minGMV}
													onChange={(e) =>
														handleTierChange(index, "minGMV", Number(e.target.value))
													}
													className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
												/>
											</div>
										</div>
										<div>
											<label className="text-foreground/70 text-xs font-medium">Max GMV</label>
											<div className="relative mt-1">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">$</span>
												<input
													type="number"
													value={tier.maxGMV === Infinity ? 999999999 : tier.maxGMV}
													onChange={(e) =>
														handleTierChange(
															index,
															"maxGMV",
															Number(e.target.value) === 999999999
																? Infinity
																: Number(e.target.value)
														)
													}
													className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
												/>
											</div>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<label className="text-foreground/70 text-xs font-medium">Type</label>
											<select
												value={tier.commissionType}
												onChange={(e) =>
													handleTierChange(
														index,
														"commissionType",
														e.target.value as CommissionType
													)
												}
												className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs mt-1 focus:outline-none focus:border-primary transition-colors"
											>
												<option value="percentage">Percentage</option>
												<option value="fixed">Fixed</option>
											</select>
										</div>
										<div>
											<label className="text-foreground/70 text-xs font-medium">
												{tier.commissionType === "percentage" ? "Rate (%)" : "Amount ($)"}
											</label>
											<div className="relative mt-1">
												<input
													type="number"
													value={tier.commissionValue}
													onChange={(e) =>
														handleTierChange(index, "commissionValue", Number(e.target.value))
													}
													className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
													step="0.1"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 text-xs">
													{tier.commissionType === "percentage" ? "%" : "$"}
												</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
						<button
							onClick={addTier}
							className="w-full px-4 py-3 text-sm bg-primary/10 text-primary border border-primary/50 rounded-lg hover:bg-primary/20 transition-colors font-medium hover:border-primary/80"
						>
							+ Add Tier
						</button>
					</div>
				)}

				{/* Breakdown */}
				<div className="border-t-2 border-border pt-6 space-y-4">
					<h3 className="text-lg font-bold text-foreground">Cost Breakdown</h3>
					<div className="bg-muted/20 border border-border/50 rounded-lg p-4 space-y-3">
						<div className="text-sm space-y-3">
							<div className="flex justify-between items-center">
								<span className="text-foreground/80 font-medium">
									Gross Merchandise Value
								</span>
								<span className="font-bold text-foreground text-lg">
									${new Intl.NumberFormat("en-US").format(Math.round(gmv))}
								</span>
							</div>
							<div className="border-t border-border/30"></div>

							<div className="flex justify-between items-center">
								<span className="text-foreground/80 font-medium">Affiliate Payout</span>
								<span className="font-semibold text-foreground">
									-${new Intl.NumberFormat("en-US").format(
										Math.round(affiliatePayoutAmount)
									)}
								</span>
							</div>

							{/* Platform Fee Breakdown */}
							<div className="bg-background/50 border border-border/30 rounded-lg p-3 space-y-2">
								<div className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
									Platform Fees
								</div>
								<div className="space-y-2 text-xs">
									{monthlyFeeComponent > 0 && (
										<div className="flex justify-between">
											<span className="text-foreground/70">Monthly Fee</span>
											<span className="text-foreground/70 font-medium">
												-$
												{new Intl.NumberFormat("en-US").format(
													Math.round(monthlyFeeComponent)
												)}
											</span>
										</div>
									)}
									<div className="flex justify-between">
										<span className="text-foreground/70">
											Performance Fee ({plan.performanceFeePercentage}%)
										</span>
										<span className="text-foreground/70 font-medium">
											-$
											{new Intl.NumberFormat("en-US").format(
												Math.round(performanceFeeComponent)
											)}
										</span>
									</div>
									<div className="flex justify-between border-t border-border/30 pt-2">
										<span className="text-foreground font-semibold">Total Platform Fee</span>
										<span className="font-bold text-foreground">
											-$
											{new Intl.NumberFormat("en-US").format(Math.round(platformFee))}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Total Takehome */}
					<div className="bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/40 rounded-lg p-5 space-y-4">
						<div className="flex justify-between items-start gap-4">
							<div>
								<span className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Your Net Revenue</span>
								<div className="text-4xl font-bold text-primary mt-1">
									${new Intl.NumberFormat("en-US").format(Math.round(yourTakehome))}
								</div>
							</div>
							<div className="text-right bg-primary/20 rounded-lg px-4 py-2">
								<span className="text-xs text-foreground/70 font-medium">Profit Margin</span>
								<div className="text-2xl font-bold text-primary">
									{gmv > 0 ? ((yourTakehome / gmv) * 100).toFixed(1) : 0}%
								</div>
							</div>
						</div>
						<p className="text-sm text-foreground/70">
							Monthly net revenue after affiliates and platform fees
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
