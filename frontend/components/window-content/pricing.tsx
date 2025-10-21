"use client";

import { useState } from "react";

export function PricingContent() {
	const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
		"monthly"
	);

	/* const plans = [
    {
      name: "Beta",
      type: "recurring",
      monthly: 19,
      annual: 19 * 11,
      performanceFee: "20% of partner payouts",
      breakevenPartnerPayouts: 1600,
      breakevenMRR: 8000,
      targetAudience: [
        "You just did or are planning your first launch!",
        "You're still validating your product and would prefer low costs until you get some real results",
      ],
    },
    {
      name: "Explorer",
      type: "recurring",
      monthly: 99,
      annual: 99 * 11,
      performanceFee: "15% of partner payouts",
      breakevenPartnerPayouts: 6000,
      breakevenMRR: 40000,
      targetAudience: [
        "Early-stage companies testing partnerships, smaller teams, experimenting.",
        "Low entry cost, higher performance based payout",
      ],
    },
    {
      name: "Builder",
      type: "recurring",
      monthly: 499,
      annual: 499 * 11,
      performanceFee: "10% of partner payouts",
      breakevenPartnerPayouts: 50000,
      breakevenMRR: 250000,
      targetAudience: ["Small teams with a few existing partners, starting to scale."],
    },
    {
      name: "Accelerator",
      type: "recurring",
      monthly: 1999,
      annual: 1999 * 11,
      performanceFee: "5% of partner payouts",
      breakevenPartnerPayouts: 100000,
      breakevenMRR: 500000,
      targetAudience: [
        "Growing companies, scaling partner programs",
        "Want predictable costs or performance-based upside.",
      ],
      popular: true,
    },
    {
      name: "Lifetime Access",
      type: "flat",
      price: 100000,
      performanceFee: "5% of partner payouts",
      breakevenTime: "4 years 2 months",
      targetAudience: ["Sick of subscriptions? Buy access for life.", "4 years, 2 months for breakeven compared to Accelerator"],
      popular: true,
    },
    {
      name: "Enterprise",
      type: "custom",
      price: "Custom",
      performanceFee: "Negotiated",
      targetAudience: [
        "Large organizations with mature partner ecosystems, complex needs.",
        "You value a dedicated support team",
        "You need custom integrations",
      ],
    },
  ] */

	const plans = [
		{
			name: "Beta",
			type: "flat",
			price: 25,
			performanceFee: "20% of GMV",
			breakevenMRR: 4000,
			targetAudience: [
				"Launching your first product or planning your first launch",
				"Testing your product with minimal recurring costs",
				"Making a small (one-time) $20 commitment to show you’re serious (credited toward your first payout)",
			],
			popular: true,
		},
		{
			name: "Bootstrap",
			type: "recurring",
			monthly: 200,
			annual: 200 * 11,
			performanceFee: "15% of GMV",
			breakevenMRR: 36000,
			targetAudience: [
				"Small teams with a few partners, ready to start scaling",
				"Businesses that want an affordable monthly subscription with moderate GMV",
			],
		},
		{
			name: "Accelerator",
			type: "recurring",
			monthly: 2000,
			annual: 2000 * 11,
			performanceFee: "10% of GMV",
			targetAudience: [
				"Large and growing companies, scaling partner programs",
				"Pay a predictable monthly fee and retain a larger share of your partner-generated revenue.",
			],
		},
		{
			name: "Enterprise",
			type: "custom",
			price: "Custom",
			performanceFee: "Negotiated",
			targetAudience: [
				"Large organizations with mature partner ecosystems and complex needs.",
				"Companies that require a dedicated support team",
				"Businesses needing custom integrations to be prioritized on our roadmap",
			],
		},
	];

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold text-foreground">Pricing Plans</h2>

			<div className="text-2xl text-foreground mb-6">
				At AffableLink
				<ul className="list-disc ml-5 mt-2">
					<li>
						Your plan determines how much you pay as a consistent fee versus a
						performance-based fee. Check the tooltips for breakeven MMR ranges.
					</li>
					<li>No features are locked behind tiers.</li>
					<li>Buying an annual plan gets you one month free.</li>
				</ul>
			</div>

			{/* Billing Toggle */}
			<div className="flex gap-4 mb-6">
				<button
					className={`px-4 py-2 rounded ${
						billingPeriod === "monthly"
							? "bg-primary text-primary-foreground"
							: "bg-muted"
					}`}
					onClick={() => setBillingPeriod("monthly")}
				>
					Monthly
				</button>
				<button
					className={`px-4 py-2 rounded ${
						billingPeriod === "annual"
							? "bg-primary text-primary-foreground"
							: "bg-muted"
					}`}
					onClick={() => setBillingPeriod("annual")}
				>
					Annual
				</button>
			</div>

			<div className="grid md:grid-cols-4 gap-4">
				{plans.map((plan, index) => (
					<div
						key={index}
						className={`bg-muted p-5 rounded border-2 ${
							plan.popular ? "border-primary" : "border-border"
						} relative`}
					>
						{plan.popular && (
							<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded">
								POPULAR
							</div>
						)}

						<h3 className="font-bold text-lg text-foreground mb-2">
							{plan.name}
						</h3>

						<div className="mb-4 flex items-center gap-2">
							{plan.type === "recurring" && (
								<>
									<span className="text-3xl font-bold text-foreground">
										$
										{billingPeriod === "monthly"
											? new Intl.NumberFormat("en-US").format(plan.monthly ?? 0)
											: new Intl.NumberFormat("en-US").format(plan.annual ?? 0)}
									</span>
									<span className="text-sm text-foreground/60">
										{billingPeriod === "monthly" ? "/mo" : "/yr"}
									</span>
								</>
							)}

							{plan.type === "flat" && (
								<>
									<span className="text-3xl font-bold text-foreground">
										${new Intl.NumberFormat("en-US").format(plan.price ?? 0)}
									</span>
									<span className="text-sm text-foreground/60">flat</span>
								</>
							)}

							{plan.type === "custom" && (
								<span className="text-3xl font-bold text-foreground">
									{plan.price}
								</span>
							)}

							{plan.performanceFee && (
								<div className="text-xs text-foreground/70 mt-1">
									{plan.performanceFee}
								</div>
							)}

							{/* Breakeven tooltip */}
							{plan.breakevenMRR && (
								<div className="ml-1 relative group cursor-pointer">
									<span className="text-xs font-semibold text-primary">ⓘ</span>
									<div className="absolute bottom-full mb-2 w-64 p-2 bg-foreground text-background text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-[9999]">
										<strong>Breakeven Example:</strong> Upgrading to the next
										plan becomes cost-effective if your platform revenue hits{" "}
										<strong>
											$
											{new Intl.NumberFormat("en-US").format(
												plan.breakevenMRR ?? 0
											)}
										</strong>
										{"/mo "}
									</div>
								</div>
							)}

							{plan.breakevenTime && (
								<div className="ml-1 relative group cursor-pointer">
									<span className="text-xs font-semibold text-primary">ⓘ</span>
									<div className="absolute bottom-full mb-2 w-64 p-2 bg-foreground text-background text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-[9999]">
										<strong>Breakeven Time:</strong> Lifetime Access becomes
										cost-effective after <strong>{plan.breakevenTime}</strong>{" "}
										on Accelerator.
										<br />
									</div>
								</div>
							)}
						</div>

						<strong className="text-foreground">Perfect For</strong>
						<ul className="space-y-2 text-sm text-foreground/80 mt-1">
							{plan.targetAudience.map((feature, i) => (
								<li key={i}>✓ {feature}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
