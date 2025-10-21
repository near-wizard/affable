// TinySeedPage.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TinySeedPage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900 p-6 lg:p-12">
			<header className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl lg:text-4xl font-extrabold">
						Affiliate Growth for TinySeed Startups
					</h1>
					<Badge>Founder Offer</Badge>
				</div>
				<p className="mt-4 text-slate-700 max-w-3xl">
					Build referral-driven growth loops that scale as you do — without
					hiring a full marketing team or burning cash on ads.
				</p>
			</header>

			<section className="max-w-5xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
				<article className="col-span-2">
					<Card>
						<CardContent>
							<h2 className="text-2xl font-semibold">
								Why this works for TinySeed companies
							</h2>
							<ul className="mt-4 space-y-3">
								<li>✅ Low CAC: pay for performance, not impressions.</li>
								<li>
									✅ Scalable & Trackable: simple dashboards for the metrics
									that matter.
								</li>
								<li>✅ Low Risk: 30-day pilot offer to prove ROI.</li>
								<li>✅ Minimal engineering: integrates with Stripe.</li>
							</ul>

							<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-4 bg-white rounded-lg shadow-sm">
									<h3 className="text-lg font-medium">TinySeed Pilot</h3>
									<p className="mt-2 text-slate-600">
										Free setup + onboarding for your first 3 affiliates. We
										handle outreach templates and initial onboarding.
									</p>
								</div>
								<div className="p-4 bg-white rounded-lg shadow-sm">
									<h3 className="text-lg font-medium">Playbook</h3>
									<p className="mt-2 text-slate-600">
										Pre-built templates (emails, creatives, tracking) so you can
										launch in 30 days.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="mt-6">
						<CardContent>
							<h3 className="text-xl font-semibold">Case Study</h3>
							<p className="mt-2 text-slate-600">
								“Increased signups by 24% in 60 days with just 4 affiliates.” —
								Tiny SaaS Alpha
							</p>
							<div className="mt-4 grid grid-cols-2 gap-3">
								<div className="p-3 bg-slate-100 rounded">+24% signups</div>
								<div className="p-3 bg-slate-100 rounded">4 affiliates</div>
								<div className="p-3 bg-slate-100 rounded">60 days</div>
								<div className="p-3 bg-slate-100 rounded">No dev time</div>
							</div>
						</CardContent>
					</Card>
				</article>

				<aside className="col-span-1">
					<Card>
						<CardContent>
							<h4 className="text-lg font-semibold">Ready to try?</h4>
							<p className="mt-2 text-slate-600">
								Book a 15-min strategy call — no pitch, just ideas tailored to
								your stack.
							</p>
							<div className="mt-4">
								<Button asChild>
									<Link href="/book?source=tinyseed">
										Book a Free 15-Min Call
									</Link>
								</Button>
							</div>

							<hr className="my-4" />

							<h5 className="font-medium">What we’ll do in the call</h5>
							<ol className="mt-2 list-decimal list-inside text-slate-600">
								<li>Quick cadence & revenue goals review</li>
								<li>3 low-friction affiliate opportunities</li>
								<li>Pilot plan you can run in 30 days</li>
							</ol>
						</CardContent>
					</Card>

					<Card className="mt-4">
						<CardContent>
							<h5 className="font-medium">Lead magnet</h5>
							<p className="mt-2 text-slate-600">
								Get the TinySeed Playbook: "Affiliate Marketing for Lean SaaS" —
								10 actionable templates.
							</p>
							<div className="mt-3">
								<Button asChild>
									<Link href="/assets/tinyseed-playbook.pdf">
										Download the Playbook
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</aside>
			</section>

			<footer className="max-w-5xl mx-auto mt-12 text-sm text-slate-500">
				<p>
					Designed for post-product/market fit SaaS founders who want
					predictable, low-cost growth.
				</p>
			</footer>
		</main>
	);
}
