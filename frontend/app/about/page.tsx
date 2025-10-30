import { Metadata } from "next";
import { AboutContent } from "@/components/window-content/about";
import Link from "next/link";

export const metadata: Metadata = {
	title: "About AffableLink - Founder-Friendly Affiliate Platform",
	description:
		"Learn about AffableLink, the premium affiliate and partner program platform built by founders for founders. Discover how we help you launch partner programs in less than 24 hours.",
	keywords: [
		"about affable",
		"founder friendly",
		"partner program platform",
		"affiliate software company",
	],
	openGraph: {
		title: "About AffableLink - Founder-Friendly Affiliate Platform",
		description:
			"The premium affiliate platform built by founders for founders.",
		url: "https://affablelink.com/about",
		type: "website",
	},
};

export default function AboutPage() {
	return (
		<div className="min-h-screen p-4 sm:p-8">
			{/* Semantic header for SEO */}
			<header className="mb-8">
				<h1 className="text-4xl font-bold text-foreground mb-4">
					About AffableLink
				</h1>
				<p className="text-xl text-foreground max-w-3xl">
					The premium affiliate and partner program platform built by founders,
					for founders.
				</p>
			</header>

			{/* SEO-optimized content section */}
			<main className="max-w-6xl mx-auto">
				<article className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl shadow-lg p-8 mb-8">
					<section className="mb-8">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Our Mission
						</h2>
						<p className="text-lg text-foreground leading-relaxed">
							We built AffableLink to solve the partner program problem that
							every founder faces: launching an affiliate program shouldn't take
							months, cost thousands, and lock you into enterprise contracts.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Why AffableLink?
						</h2>
						<ul className="space-y-4 text-lg text-foreground">
							<li className="flex gap-3">
								<span className="text-2xl">⚡</span>
								<span>
									<strong>Fast</strong> - Launch in less than 24 hours, not
									months
								</span>
							</li>
							<li className="flex gap-3">
								<span className="text-2xl">💰</span>
								<span>
									<strong>Affordable</strong> - Usage-based pricing, no minimums
									or enterprise contracts
								</span>
							</li>
							<li className="flex gap-3">
								<span className="text-2xl">🎯</span>
								<span>
									<strong>Complete</strong> - All premium features included, no
									gatekeeping
								</span>
							</li>
							<li className="flex gap-3">
								<span className="text-2xl">🤝</span>
								<span>
									<strong>Founder-Built</strong> - By founders who've run
									partner programs
								</span>
							</li>
						</ul>
					</section>

					<section>
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Built for Growth
						</h2>
						<p className="text-lg text-foreground leading-relaxed">
							AffableLink scales with your business. Start with your first
							partner, grow to hundreds, thousands, or more. Our infrastructure
							and pricing grow with you—no surprises, no renegotiations.
						</p>
					</section>
				</article>

				{/* Desktop UI preview - for UX but also aids SEO as progressive enhancement */}
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Interactive Platform
					</h2>
					<p className="text-muted-foreground mb-6">
						Experience the desktop-inspired interface that makes partner program
						management intuitive and delightful:
					</p>
					<Link href="/desktop">
						<div className="bg-muted rounded-lg p-8 min-h-[600px] flex items-center justify-center text-center text-muted-foreground">
							<div>
								<p className="mb-4 text-lg font-medium">
									Click the About window icon on the left to see the interactive
									desktop experience
								</p>
								<p className="text-sm text-muted-foreground">
									The desktop UI provides the full, immersive AffableLink
									experience
								</p>
							</div>
						</div>
					</Link>
				</div>
			</main>
		</div>
	);
}
