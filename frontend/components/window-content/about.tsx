"use client";

import { useState } from "react";
import { DemoNetwork } from "../networkgraph";
import { Zap, TrendingUp, Shield, Clock, Lightbulb, Users } from "lucide-react";

export function AboutContent() {
	const [userType, setUserType] = useState<"vendor" | "partner">("vendor");

	return (
		<div className="space-y-8">
			{/* User Type Toggle */}
			<div className="flex items-center justify-center gap-4">
				<button
					className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
						userType === "vendor"
							? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
							: "bg-muted text-foreground hover:bg-muted/80 hover:shadow-lg"
					}`}
					onClick={() => setUserType("vendor")}
				>
					For Vendors
				</button>
				<div className="text-sm font-medium text-foreground/60">or</div>
				<button
					className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
						userType === "partner"
							? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
							: "bg-muted text-foreground hover:bg-muted/80 hover:shadow-lg"
					}`}
					onClick={() => setUserType("partner")}
				>
					For Partners
				</button>
			</div>

			{/* Vendor Content */}
			{userType === "vendor" && (
				<div className="space-y-12">
					{/* Hero Section */}
					<div className="space-y-4">
						<div className="space-y-2">
							<h1 className="text-4xl font-bold text-foreground">
								AffableLink for Vendors
							</h1>
							<p className="text-xl text-foreground/70">
								A premium partner platform that scales from your first partner to thousands
							</p>
						</div>

						<div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15 transition-all duration-300">
							<p className="text-foreground/90 leading-relaxed">
								Stop spending months on partner program setup. AffableLink is the founder-friendly, premium partner relationship platform built to scale with you—from day one through hypergrowth. Launch your first campaign in <strong>less than 24 hours</strong>, then scale effortlessly to thousands of partners as your business grows. Enterprise-grade infrastructure designed by founders, for founders.
							</p>
						</div>
					</div>

					{/* The Problem Section */}
					<div className="space-y-4">
						<h2 className="text-2xl font-bold text-foreground">The Enterprise Trap</h2>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="bg-muted border border-border/50 rounded-lg p-6 space-y-3">
								<div className="text-sm font-semibold text-primary">Traditional Enterprise Platforms</div>
								<ul className="space-y-2 text-sm text-foreground/80">
									<li>✗ 74+ days to launch (PartnerStack average)</li>
									<li>✗ Heavy enterprise pricing with minimums</li>
									<li>✗ Months of manual onboarding and setup</li>
									<li>✗ Rigid, inflexible architecture</li>
									<li>✗ You're locked in once you commit</li>
								</ul>
							</div>

							<div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-lg p-6 space-y-3">
								<div className="text-sm font-semibold text-primary">AffableLink Premium</div>
								<ul className="space-y-2 text-sm text-foreground/90">
									<li>✓ Live in less than 24 hours</li>
									<li>✓ Premium platform with premium support</li>
									<li>✓ Fully automated, zero manual work</li>
									<li>✓ Architected to scale with your growth</li>
									<li>✓ We grow when you grow—partnership, not gatekeeping</li>
								</ul>
							</div>
						</div>
					</div>

					{/* Vision for Vendors */}
					<div className="space-y-6">
						<h2 className="text-2xl font-bold text-foreground">Why Build Your Partner Channel Now?</h2>
						<p className="text-foreground/80 leading-relaxed text-lg">
							Partner-driven revenue is one of the highest-ROI channels for SaaS. Your competitors are already building theirs. With AffableLink—a founder-friendly, premium platform—you won't be left behind. Get started immediately with infrastructure that scales effortlessly as you grow from your first partner to thousands.
						</p>

						<div className="grid md:grid-cols-3 gap-4">
							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<Zap className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">Launch Instantly</h3>
								<p className="text-sm text-foreground/70">
									No weeks of onboarding. Start recruiting partners and generating revenue this week.
								</p>
							</div>

							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<TrendingUp className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">Accelerate Growth</h3>
								<p className="text-sm text-foreground/70">
									Turn partners into your highest-ROI channel. Real-time tracking helps you optimize and scale.
								</p>
							</div>

							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<Shield className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">Stay in Control</h3>
								<p className="text-sm text-foreground/70">
									Full visibility into partner performance, fraud detection, and commission management.
								</p>
							</div>
						</div>
					</div>

					{/* Features for Vendors */}
					<div className="space-y-6">
						<h2 className="text-2xl font-bold text-foreground">Vendor Features</h2>

						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Instant Campaign Setup</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Create campaigns in minutes with pre-built templates and customizable commission structures.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Real-Time Analytics</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Live dashboards showing partner performance, revenue attribution, and commission payouts.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Shield className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Fraud Protection</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Advanced anomaly detection and custom rules to protect your margins automatically.
										</p>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Flexible Commissions</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Fixed, percentage-based, or tiered commissions. Mix and match for different partner tiers.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Users className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Partner Management</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Recruit, approve, and manage partners from a single dashboard. Track every relationship.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Zap className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Automated Payouts</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Schedule monthly or custom payout intervals. Integrate with PayPal, Stripe, and more.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Scaling & Partnership Section */}
					<div className="space-y-6 pt-6">
						<h2 className="text-2xl font-bold text-foreground">The Founder-Friendly Difference</h2>
						<p className="text-foreground/80 leading-relaxed">
							We're not a transactional vendor extracting maximum fees. We're built as a true partner platform, created by founders who understand your challenges. Your success is our success, and our architecture and pricing reflect that.
						</p>
						<div className="grid md:grid-cols-2 gap-6">
							<div className="bg-muted/30 border border-border/50 rounded-lg p-6 space-y-3">
								<h3 className="font-semibold text-foreground text-lg">Premium Architecture Built to Scale</h3>
								<p className="text-sm text-foreground/70 leading-relaxed">
									Enterprise-grade infrastructure designed from day one for growth. Handle your first partner or your ten-thousandth without switching platforms, renegotiating contracts, or paying surprise fees. Just seamless scaling at premium quality.
								</p>
							</div>

							<div className="bg-muted/30 border border-border/50 rounded-lg p-6 space-y-3">
								<h3 className="font-semibold text-foreground text-lg">We Grow When You Grow</h3>
								<p className="text-sm text-foreground/70 leading-relaxed">
									No gatekeeping. No enterprise tax. Our pricing scales fairly with your success. When you hit your first million in partner revenue, we're still your partner—not suddenly demanding a renegotiation. Alignment over extraction.
								</p>
							</div>
						</div>
					</div>

					{/* Vendor CTA */}
					<div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 rounded-lg p-8 space-y-4 shadow-xl shadow-primary/15 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 transform hover:scale-102">
						<h2 className="text-2xl font-bold text-foreground">Ready to Launch Your Partner Program?</h2>
						<p className="text-foreground/90 leading-relaxed">
							Your best partner-driven revenue is waiting. Build a premium partner channel that scales with you. Start recruiting partners today with transparent pricing and zero onboarding friction. You'll be live faster than your competitors and capturing partner-driven revenue by next week.
						</p>
					</div>
				</div>
			)}

			{/* Partner Content */}
			{userType === "partner" && (
				<div className="space-y-12">
					{/* Hero Section */}
					<div className="space-y-4">
						<div className="space-y-2">
							<h1 className="text-4xl font-bold text-foreground">
								AffableLink for Partners
							</h1>
							<p className="text-xl text-foreground/70">
								Earn money promoting products you believe in
							</p>
						</div>

						<div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15 transition-all duration-300">
							<p className="text-foreground/90 leading-relaxed">
								AffableLink connects you with innovative companies and products worth promoting. Get paid for every customer you refer, with transparent earnings tracking, flexible payment options, and a supportive community of partners who are building real business.
							</p>
						</div>
					</div>

					{/* Why Partner Section */}
					<div className="space-y-4">
						<h2 className="text-2xl font-bold text-foreground">Why Partner With Us?</h2>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="bg-muted border border-border/50 rounded-lg p-6 space-y-3">
								<div className="text-sm font-semibold text-primary">Traditional Affiliate Programs</div>
								<ul className="space-y-2 text-sm text-foreground/80">
									<li>✗ Low commission rates (2-5%)</li>
									<li>✗ Slow or unclear tracking</li>
									<li>✗ Delayed or unpredictable payouts</li>
									<li>✗ Poor communication from vendors</li>
									<li>✗ No support or resources</li>
								</ul>
							</div>

							<div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-lg p-6 space-y-3">
								<div className="text-sm font-semibold text-primary">AffableLink Partners</div>
								<ul className="space-y-2 text-sm text-foreground/90">
									<li>✓ Competitive commissions (up to 20%+)</li>
									<li>✓ Real-time conversion tracking</li>
									<li>✓ Monthly payouts, no delays</li>
									<li>✓ Direct access to vendor team</li>
									<li>✓ Marketing materials and support</li>
								</ul>
							</div>
						</div>
					</div>

					{/* Partner Benefits */}
					<div className="space-y-6">
						<h2 className="text-2xl font-bold text-foreground">Partner Benefits</h2>
						<p className="text-foreground/80 leading-relaxed text-lg">
							We believe partners deserve transparency, fair compensation, and genuine support. Every product on AffableLink is vetted. Every commission structure is competitive. Your success is our success.
						</p>

						<div className="grid md:grid-cols-3 gap-4">
							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<Zap className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">Earn More</h3>
								<p className="text-sm text-foreground/70">
									Competitive commissions with high-quality products. Earn real money from referrals that matter.
								</p>
							</div>

							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<TrendingUp className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">See Real-Time Earnings</h3>
								<p className="text-sm text-foreground/70">
									Track every click, conversion, and commission. Complete transparency into your earnings.
								</p>
							</div>

							<div className="bg-muted/50 border border-border/50 rounded-lg p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
								<Shield className="w-8 h-8 text-primary" />
								<h3 className="font-semibold text-foreground">Get Paid Reliably</h3>
								<p className="text-sm text-foreground/70">
									Monthly payouts to PayPal, bank transfer, or crypto. Fast, reliable, no surprises.
								</p>
							</div>
						</div>
					</div>

					{/* How It Works */}
					<div className="space-y-6">
						<h2 className="text-2xl font-bold text-foreground">How It Works</h2>

						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">1</div>
									<div>
										<h4 className="font-semibold text-foreground">Find Products to Promote</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Browse vetted companies and products. Read commission rates and find ones aligned with your audience.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">2</div>
									<div>
										<h4 className="font-semibold text-foreground">Get Your Unique Link</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Receive branded links and marketing materials. Share with your audience however you like.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">3</div>
									<div>
										<h4 className="font-semibold text-foreground">Earn Commissions</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Every customer who signs up through your link earns you a commission. Track in real-time.
										</p>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">4</div>
									<div>
										<h4 className="font-semibold text-foreground">Get Paid Monthly</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Withdraw your earnings every month via your preferred payment method.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Marketing Support</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Access email templates, swipe copy, and social media assets to promote effectively.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Users className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
									<div>
										<h4 className="font-semibold text-foreground">Partner Community</h4>
										<p className="text-sm text-foreground/70 mt-1">
											Connect with other partners. Share ideas, strategies, and celebrate wins together.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Partner Types */}
					<div className="space-y-4">
						<h2 className="text-2xl font-bold text-foreground">Perfect For</h2>
						<div className="grid md:grid-cols-3 gap-4">
							<div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-5 space-y-2">
								<h4 className="font-semibold text-foreground">Content Creators</h4>
								<p className="text-sm text-foreground/70">
									Promote tools that your audience loves. Earn commission on every customer you bring.
								</p>
							</div>

							<div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-5 space-y-2">
								<h4 className="font-semibold text-foreground">SaaS Communities</h4>
								<p className="text-sm text-foreground/70">
									Share tools with your community and build a revenue stream on the side.
								</p>
							</div>

							<div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-5 space-y-2">
								<h4 className="font-semibold text-foreground">Agencies & Consultants</h4>
								<p className="text-sm text-foreground/70">
									Recommend tools to clients and earn recurring revenue on every referral.
								</p>
							</div>
						</div>
					</div>

					{/* Partner CTA */}
					<div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20 rounded-lg p-8 space-y-4">
						<h2 className="text-2xl font-bold text-foreground">Ready to Start Earning?</h2>
						<p className="text-foreground/90 leading-relaxed">
							Join a community of partners building real business through quality products and fair commissions. Find products worth promoting and start earning money on referrals this month.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
