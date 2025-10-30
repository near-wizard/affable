// ProductHuntPage.tsx

"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProductHuntPage() {
	return (
		<main className="min-h-screen bg-gradient-to-b from-white to-sky-50 text-slate-900 p-6 lg:p-12">
			<header className="max-w-5xl mx-auto text-center">
				<h1 className="text-3xl lg:text-4xl font-extrabold">
					Keep Your Product Hunt Momentum Going
				</h1>
				<p className="mt-3 text-slate-700">
					Turn launch buzz into long-term user growth with community-friendly
					affiliate programs and ready-made share kits.
				</p>
			</header>

			<section className="max-w-5xl mx-auto mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="col-span-2">
					<Card>
						<CardContent>
							<h2 className="text-2xl font-semibold">Launch-friendly Kits</h2>
							<p className="mt-3 text-slate-600">
								One-click promo kits, tweet & post templates, and tracking links
								so your supporters can share with attribution.
							</p>

							<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-4 bg-white rounded shadow-sm">
									<h4 className="font-medium">Share Kits</h4>
									<p className="text-sm mt-1">
										Pre-made tweets, images, and CTAs for Product Hunt posts and
										maker communities.
									</p>
								</div>
								<div className="p-4 bg-white rounded shadow-sm">
									<h4 className="font-medium">No-code setup</h4>
									<p className="text-sm mt-1">
										Works with Gumroad, LemonSqueezy, Stripe, or simple
										coupon-based rewards.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="mt-6">
						<CardContent>
							<h3 className="text-xl font-semibold">
								Product Hunt Launch Offer
							</h3>
							<p className="mt-2 text-slate-600">
								Free setup for your first 3 affiliates and a Launch Extension
								Kit to turn upvotes into signups.
							</p>
						</CardContent>
					</Card>
				</div>

				<aside>
					<Card>
						<CardContent>
							<h4 className="text-lg font-semibold">
								Get the Launch Extension Kit
							</h4>
							<p className="mt-2 text-slate-600">
								Includes social templates, tracking links, and onboarding
								scripts for your first 3 advocates.
							</p>
							<div className="mt-4">
								<Button asChild>
									<Link href="/assets/launch-extension-kit.zip">
										Download the Kit
									</Link>
								</Button>
							</div>

							<div className="mt-6">
								<Button asChild>
									<Link href="/book?source=producthunt">Claim Free Setup</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className="mt-4">
						<CardContent>
							<h5 className="font-medium">Community Proof</h5>
							<p className="mt-2 text-slate-600">
								Join other makers who turned launch buzz into sustainable
								signups.
							</p>
						</CardContent>
					</Card>
				</aside>
			</section>

			<footer className="max-w-5xl mx-auto mt-12 text-sm text-muted-foreground text-center">
				<p>
					Friendly, maker-first approach — built to keep momentum after launch
					day.
				</p>
			</footer>
		</main>
	);
}
