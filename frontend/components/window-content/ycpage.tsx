// YCPage.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function YCPage() {
	return (
		<main className="min-h-screen bg-white text-slate-900 p-6 lg:p-12">
			<header className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl lg:text-4xl font-extrabold">
						Affiliate Programs Built for Growth-Obsessed Teams
					</h1>
					<div className="text-sm text-slate-600">YC Founder Pilot</div>
				</div>
				<p className="mt-4 text-slate-700 max-w-3xl">
					Fast experiments, measurable lift. Launch an affiliate funnel that
					gives you clean attribution and scalable partner channels.
				</p>
			</header>

			<section className="max-w-6xl mx-auto mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="col-span-2">
					<Card>
						<CardContent>
							<h2 className="text-2xl font-semibold">
								Speed, Data, and Control
							</h2>
							<p className="mt-3 text-slate-600">
								We built a repeatable process YC teams use to test affiliate
								channels in under 7 days and scale the winners.
							</p>

							<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 bg-slate-50 rounded shadow-sm">
									<h4 className="font-medium">Launch in Days</h4>
									<p className="text-sm mt-1">
										Plug-and-play templates for tracking, rewards, and
										creatives.
									</p>
								</div>
								<div className="p-4 bg-slate-50 rounded shadow-sm">
									<h4 className="font-medium">Clean Attribution</h4>
									<p className="text-sm mt-1">
										We help you track signups back to creatives and partners —
										no messy spreadsheets.
									</p>
								</div>
								<div className="p-4 bg-slate-50 rounded shadow-sm">
									<h4 className="font-medium">Engineering-light</h4>
									<p className="text-sm mt-1">
										Works with Stripe webhook integration.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="mt-6">
						<CardContent>
							<h3 className="text-xl font-semibold">
								YC Pilot: 7-Day Fast Experiment
							</h3>
							<ul className="mt-3 list-disc list-inside text-slate-600">
								<li>Day 0–1: Setup & tracking</li>
								<li>Day 2–4: Affiliate recruitment & creative testing</li>
								<li>Day 5–7: Quick analysis & scale plan</li>
							</ul>
						</CardContent>
					</Card>
				</div>

				<aside>
					<Card>
						<CardContent>
							<h4 className="text-lg font-semibold">Get the 7-day plan</h4>
							<p className="mt-2 text-slate-600">
								Enter your email and we’ll send the exact checklist used with
								early YC pilots.
							</p>
							<form
								className="mt-4 space-y-3"
								onSubmit={(e) => e.preventDefault()}
							>
								<Input placeholder="you@company.com" />
								<Button type="submit">Send me the checklist</Button>
							</form>

							<div className="mt-6">
								<Button asChild variant="secondary">
									<Link href="/book?source=yc">
										Schedule a Rapid Pilot Call
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className="mt-4">
						<CardContent>
							<h5 className="font-medium">Integrations</h5>
							<p className="mt-2 text-slate-600">
								Stripe · PostHog · Internal webhooks
							</p>
						</CardContent>
					</Card>
				</aside>
			</section>

			<footer className="max-w-6xl mx-auto mt-12 text-sm text-slate-500">
				<p>
					Designed for startups prioritizing rapid, data-driven growth
					experiments.
				</p>
			</footer>
		</main>
	);
}
