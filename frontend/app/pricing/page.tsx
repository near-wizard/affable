import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Pricing - AffableLink | Affordable Affiliate Software",
	description:
		"Simple, transparent pricing for affiliate and partner programs. Pay only for what you use. No minimums, no contracts, no surprises.",
	keywords: [
		"affiliate pricing",
		"partner program pricing",
		"commission management cost",
		"SaaS pricing",
	],
	openGraph: {
		title: "Pricing - AffableLink | Affordable Affiliate Software",
		description: "Transparent, usage-based pricing. Only pay for what you use.",
		url: "https://affablelink.com/pricing",
		type: "website",
	},
};

export default function PricingPage() {
	return (
		<div className="min-h-screen p-4 sm:p-8">
			<header className="mb-8">
				<h1 className="text-4xl font-bold text-foreground mb-4">Pricing</h1>
				<p className="text-xl text-foreground max-w-3xl">
					Simple, transparent, founder-friendly pricing. No minimums, no
					contracts.
				</p>
			</header>

			<main className="max-w-6xl mx-auto">
				<article className="bg-muted/30 rounded-2xl shadow-lg p-8 mb-8">
					<section className="mb-12">
						<h2 className="text-3xl font-bold text-foreground mb-6">
							Usage-Based Pricing
						</h2>
						<p className="text-lg text-foreground mb-8">
							You only pay for what you use. Launch with your first partner,
							scale to thousands. Your costs grow with your business, not
							before.
						</p>

						<div className="grid md:grid-cols-3 gap-6">
							<div className="bg-muted border-2 border-border rounded-lg p-6">
								<h3 className="text-2xl font-bold text-foreground mb-2">
									Starter
								</h3>
								<p className="text-3xl font-bold text-primary mb-4">Free</p>
								<p className="text-muted-foreground mb-6">
									Perfect for getting started
								</p>
								<ul className="space-y-2 text-foreground">
									<li className="flex gap-2">
										<span>✓</span> 1-5 partners
									</li>
									<li className="flex gap-2">
										<span>✓</span> Basic analytics
									</li>
									<li className="flex gap-2">
										<span>✓</span> Commission tracking
									</li>
									<li className="flex gap-2">
										<span>✓</span> All features included
									</li>
								</ul>
							</div>

							<div className="bg-primary/10 border-2 border-blue-400 rounded-lg p-6 relative">
								<div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg text-sm font-bold border-2 border-blueberry">
									MOST POPULAR
								</div>
								<h3 className="text-2xl font-bold text-foreground mb-2 mt-6">
									Growth
								</h3>
								<p className="text-3xl font-bold text-primary mb-4">
									$99<span className="text-lg">/mo</span>
								</p>
								<p className="text-muted-foreground mb-6">As your program scales</p>
								<ul className="space-y-2 text-foreground">
									<li className="flex gap-2">
										<span>✓</span> Up to 50 partners
									</li>
									<li className="flex gap-2">
										<span>✓</span> Advanced analytics
									</li>
									<li className="flex gap-2">
										<span>✓</span> Fraud detection
									</li>
									<li className="flex gap-2">
										<span>✓</span> Webhook integrations
									</li>
									<li className="flex gap-2">
										<span>✓</span> Priority support
									</li>
								</ul>
							</div>

							<div className="bg-muted border-2 border-border rounded-lg p-6">
								<h3 className="text-2xl font-bold text-foreground mb-2">
									Enterprise
								</h3>
								<p className="text-3xl font-bold text-primary mb-4">Custom</p>
								<p className="text-muted-foreground mb-6">For established programs</p>
								<ul className="space-y-2 text-foreground">
									<li className="flex gap-2">
										<span>✓</span> Unlimited partners
									</li>
									<li className="flex gap-2">
										<span>✓</span> Custom integrations
									</li>
									<li className="flex gap-2">
										<span>✓</span> Dedicated support
									</li>
									<li className="flex gap-2">
										<span>✓</span> SLA guarantees
									</li>
								</ul>
							</div>
						</div>
					</section>

					<section>
						<h2 className="text-3xl font-bold text-foreground mb-6">
							What's Included
						</h2>
						<div className="bg-muted rounded-lg p-6">
							<h3 className="text-xl font-bold text-foreground mb-4">
								Every plan includes:
							</h3>
							<ul className="grid md:grid-cols-2 gap-4">
								{[
									"Real-time analytics dashboard",
									"Fraud detection & prevention",
									"Commission management",
									"Custom attribution models",
									"Partner dashboard",
									"Smart link generation",
									"Multi-currency support",
									"REST API & webhooks",
									"Auto payouts",
									"Email support",
									"Affiliate onboarding",
									"Performance tracking",
								].map((feature) => (
									<li key={feature} className="flex gap-2 text-foreground">
										<span className="text-primary font-bold">✓</span>
										{feature}
									</li>
								))}
							</ul>
						</div>
					</section>
				</article>

				<div className="bg-white rounded-2xl shadow-lg p-8">
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Interactive Pricing Calculator
					</h2>
					<p className="text-muted-foreground mb-6">
						Click the Pricing window icon on the left to see detailed pricing
						information and interactive tools.
					</p>
					<div className="bg-muted rounded-lg p-8 min-h-[400px] flex items-center justify-center text-center text-muted-foreground">
						<p className="text-lg font-medium">
							Open the interactive Pricing window for detailed information
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
