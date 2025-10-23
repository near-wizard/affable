"use client";

import { useState } from "react";
import { PricingCalculator } from "./pricing-calculator";

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
			performanceFee: "10% of GMV",
			targetAudience: [
				"Launching your first product or planning your first launch",
				"Testing your product with minimal recurring costs",
				"Making a small (one-time) $20 commitment to show you're serious (credited toward your first payout)",
			],
			popular: true,
		},
		{
			name: "Bootstrap",
			type: "recurring",
			monthly: 200,
			annual: 200 * 11,
			performanceFee: "8% of GMV",
			breakevenMRR: 4000,
			breakevenNote: "breakeven with Beta",
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
			performanceFee: "5% of GMV",
			breakevenMRR: 36000,
			breakevenNote: "breakeven with Bootstrap",
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
		<div className="space-y-12">
			{/* Header Section */}
			<div className="space-y-4">
				<div>
					<h1 className="text-4xl font-bold text-foreground mb-2">
						Simple, Transparent Pricing
					</h1>
					<p className="text-lg text-foreground/70">
						Choose the plan that grows with your partner program
					</p>
				</div>

				<div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 space-y-3">
					<h3 className="font-semibold text-foreground">
						How AffableLink Pricing Works
					</h3>
					<ul className="space-y-2 text-sm text-foreground/80">
						<li className="flex items-start gap-2">
							<span className="text-primary font-bold">•</span>
							<span>
								Pay a base fee plus a performance fee on your partner-generated
								revenue
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary font-bold">•</span>
							<span>
								No features locked behind tiers — all plans include full
								platform access
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary font-bold">•</span>
							<span>
								Annual plans save 1 month's cost — lock in savings with a yearly
								commitment
							</span>
						</li>
					</ul>
				</div>
			</div>

			{/* Billing Toggle */}
			<div className="flex items-center justify-center gap-4">
				<button
					className={`px-6 py-3 rounded-lg font-medium transition-all ${
						billingPeriod === "monthly"
							? "bg-primary text-primary-foreground shadow-lg"
							: "bg-muted text-foreground hover:bg-muted/80"
					}`}
					onClick={() => setBillingPeriod("monthly")}
				>
					Monthly Billing
				</button>
				<div className="text-sm font-medium text-foreground/60">or</div>
				<button
					className={`px-6 py-3 rounded-lg font-medium transition-all ${
						billingPeriod === "annual"
							? "bg-primary text-primary-foreground shadow-lg"
							: "bg-muted text-foreground hover:bg-muted/80"
					}`}
					onClick={() => setBillingPeriod("annual")}
				>
					Annual Billing
					<span className="ml-2 text-xs font-bold text-primary-foreground/90">
						Save 1 month
					</span>
				</button>
			</div>

			{/* Plans Grid */}
			<div className="grid md:grid-cols-4 gap-6">
				{plans.map((plan, index) => (
					<div
						key={index}
						className={`relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
							plan.popular
								? "md:scale-105 bg-gradient-to-br from-primary/5 to-primary/0 border-2 border-primary shadow-lg"
								: "bg-muted border-2 border-border hover:border-primary/30 shadow-sm"
						}`}
					>
						{/* Popular Badge */}
						{plan.popular && (
							<div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold rounded-bl-lg">
								MOST POPULAR
							</div>
						)}

						{/* Content Container */}
						<div className="p-8 space-y-6">
							{/* Plan Name */}
							<div>
								<h3 className="text-2xl font-bold text-foreground mb-1">
									{plan.name}
								</h3>
								{plan.popular && (
									<p className="text-xs font-medium text-primary">
										Best for scaling teams
									</p>
								)}
							</div>

							{/* Pricing */}
							<div className="space-y-2">
								<div className="flex items-baseline gap-1">
									{plan.type === "recurring" && (
										<>
											<span className="text-4xl font-bold text-foreground">
												$
												{billingPeriod === "monthly"
													? new Intl.NumberFormat("en-US").format(
															plan.monthly ?? 0
													  )
													: new Intl.NumberFormat("en-US").format(
															plan.annual ?? 0
													  )}
											</span>
											<span className="text-sm text-foreground/60">
												{billingPeriod === "monthly" ? "/month" : "/year"}
											</span>
										</>
									)}

									{plan.type === "flat" && (
										<>
											<span className="text-4xl font-bold text-foreground">
												$
												{new Intl.NumberFormat("en-US").format(plan.price ?? 0)}
											</span>
											<span className="text-sm text-foreground/60">
												one-time
											</span>
										</>
									)}

									{plan.type === "custom" && (
										<span className="text-4xl font-bold text-foreground">
											{plan.price}
										</span>
									)}
								</div>

								{/* Performance Fee */}
								{plan.performanceFee && (
									<div className="text-sm text-foreground/70 font-medium flex items-center gap-2">
										<span className="inline-block w-1.5 h-1.5 bg-primary rounded-full"></span>
										{plan.performanceFee}
									</div>
								)}
							</div>

							{/* Divider */}
							<div className="h-px bg-border/50"></div>

							{/* Perfect For Section */}
							<div className="space-y-3">
								<p className="text-sm font-semibold text-foreground">
									Perfect for:
								</p>
								<ul className="space-y-2">
									{plan.targetAudience.map((feature, i) => (
										<li
											key={i}
											className="text-sm text-foreground/80 flex items-start gap-2"
										>
											<span className="text-primary font-bold text-lg leading-none mt-0.5">
												+
											</span>
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>

							{/* Breakeven Info */}
							{(plan.breakevenMRR || plan.breakevenTime) && (
								<div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
									<div className="relative group cursor-pointer inline-flex items-center gap-2 w-full">
										<span className="text-xs font-semibold text-primary">
											ℹ
										</span>
										<span className="text-xs text-foreground/70 flex-1">
											{plan.breakevenMRR &&
												`Breakeven at a GMV of $${new Intl.NumberFormat(
													"en-US"
												).format(
													plan.breakevenMRR
												)}/mo compared to the previous tier plan`}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Pricing Calculator Section */}
			<div className="space-y-6 pt-8">
				<div className="space-y-2">
					<h2 className="text-3xl font-bold text-foreground">
						Calculate Your Costs
					</h2>
					<p className="text-lg text-foreground/70">
						See exactly what you'll pay with your GMV and commission structure
					</p>
				</div>
				<PricingCalculator />
			</div>
		</div>
	);
}
