"use client";

import { useState } from "react";
//import { loadPostHog } from "@/utils/posthogLazyLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "../ui/card";

export default function VendorInterestForm() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		company: "",
		industry: "",
		monthlyRevenue: "",
		targetMarket: "",
		existingPartners: "",
		goals: "",
		paymentProcessing: [] as string[],
		paymentProcessingOther: "",
		crm: [] as string[],
		crmOther: "",
		eventTracking: [] as string[],
		eventTrackingOther: "",

		// New Fields
		partnershipType: [] as string[],
		existingAffiliateProgram: "",
		affiliatePlatform: "",
		contactPreference: "",
		decisionTimeline: "",
		heardAbout: "",
	});

	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value, type, checked } = e.target as HTMLInputElement;

		// Handle grouped checkboxes (e.g., paymentProcessing__Stripe)
		if (type === "checkbox") {
			const [field, _] = name.split("__");
			setFormData((prev) => {
				const prevArr = prev[field as keyof typeof prev] as string[];
				if (checked) {
					return { ...prev, [field]: [...prevArr, value] };
				} else {
					return { ...prev, [field]: prevArr.filter((v) => v !== value) };
				}
			});
		} else {
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			/*
      const ph = await loadPostHog()
      ph.capture('vendorInterestForm_submitted', { ...formData })
      */

			const res = await fetch("/api/vendorInterest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			if (!res.ok) throw new Error("Failed to submit form");
			setSubmitted(true);
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Something went wrong");
		} finally {
			setLoading(false);
		}
	};

	if (submitted) {
		return (
			<div className="text-center py-12">
				<div className="text-6xl mb-4">✓</div>
				<h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
				<p className="text-foreground/70">
					We've received your information and will be in touch shortly.
				</p>
			</div>
		);
	}

	const renderCheckboxGroup = (
		label: string,
		field: "paymentProcessing" | "crm" | "eventTracking" | "partnershipType",
		options: string[],
		otherField?: "paymentProcessingOther" | "crmOther" | "eventTrackingOther"
	) => (
		<div className="space-y-2">
			<Label>{label} (optional)</Label>
			<div className="flex flex-col gap-2 ml-2">
				{options.map((option) => (
					<label key={option} className="flex items-center gap-2">
						<input
							type="checkbox"
							name={`${field}__${option}`}
							value={option}
							checked={(formData[field] as string[]).includes(option)}
							onChange={handleChange}
							className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
						/>
						<span className="text-foreground">{option}</span>
					</label>
				))}

				{otherField && (
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							name={`${otherField}__Other`}
							value="Other"
							checked={!!formData[otherField]}
							onChange={(e) => {
								if (!formData[otherField])
									setFormData({ ...formData, [otherField]: "" });
							}}
							className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
						/>
						<input
							type="text"
							placeholder="Other (write in)"
							name={otherField}
							value={formData[otherField]}
							onChange={handleChange}
							className="flex-1 px-3 py-1 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						/>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground mb-2">Get Started</h2>
				<p className="text-foreground/70">
					Fill out the form below and we'll get you set up with Affable.
				</p>
			</div>

			<Card className="mt-12 border border-border bg-card p-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Info */}
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							name="name"
							type="text"
							required
							value={formData.name}
							onChange={handleChange}
							placeholder="John Smith"
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Work Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
							value={formData.email}
							onChange={handleChange}
							placeholder="john@company.com"
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="company">Company Name</Label>
						<Input
							id="company"
							name="company"
							type="text"
							required
							value={formData.company}
							onChange={handleChange}
							placeholder="Acme Inc."
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="industry">Industry / Sector</Label>
						<Input
							id="industry"
							name="industry"
							type="text"
							required
							value={formData.industry}
							onChange={handleChange}
							placeholder="SaaS, E-commerce, etc."
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="monthlyRevenue">Monthly Revenue</Label>
						<select
							id="monthlyRevenue"
							name="monthlyRevenue"
							required
							value={formData.monthlyRevenue}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						>
							<option value="">Select revenue range</option>
							<option value="<8k">&lt; $8k</option>
							<option value="8k-40k">$8k - $40k</option>
							<option value="40k-250k">$40k - $250k</option>
							<option value="250k-500k">$250k - $500k</option>
							<option value="500k+">&gt; $500k</option>
						</select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="targetMarket">Target Customer / Market</Label>
						<Input
							id="targetMarket"
							name="targetMarket"
							type="text"
							required
							value={formData.targetMarket}
							onChange={handleChange}
							placeholder="Small businesses, consumers, enterprises..."
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="existingPartners">
							Current Partner Relationships
						</Label>
						<select
							id="existingPartners"
							name="existingPartners"
							required
							value={formData.existingPartners}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						>
							<option value="">Select an option</option>
							<option value="No partners">No partners</option>
							<option value="A few partners">A few partners (1-5)</option>
							<option value="Some partners">Some partners (6-20)</option>
							<option value="Many partners">Many partners (20+)</option>
						</select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="goals">Goals in Joining</Label>
						<Textarea
							id="goals"
							name="goals"
							required
							value={formData.goals}
							onChange={handleChange}
							placeholder="What do you hope to achieve with Affable?"
							className="min-h-[100px] bg-background"
						/>
					</div>

					{/* New Section: Partnership Interests */}
					{renderCheckboxGroup("Partnership Interests", "partnershipType", [
						"Affiliate Program",
						"Referral Program",
						"Reseller / White-Label",
					])}

					{/* Optional Tech Stack Checkboxes */}
					{renderCheckboxGroup(
						"Payment Processing",
						"paymentProcessing",
						["Stripe", "PayPal", "Paddle"],
						"paymentProcessingOther"
					)}
					{renderCheckboxGroup(
						"CRM",
						"crm",
						["HubSpot", "Salesforce", "Pipedrive"],
						"crmOther"
					)}
					{renderCheckboxGroup(
						"Event Tracking / Analytics",
						"eventTracking",
						["Google Analytics", "Mixpanel", "PostHog"],
						"eventTrackingOther"
					)}

					{/* Program Management Context */}
					<div className="space-y-2">
						<Label htmlFor="existingAffiliateProgram">
							Do you already have an affiliate or referral program?
						</Label>
						<select
							id="existingAffiliateProgram"
							name="existingAffiliateProgram"
							value={formData.existingAffiliateProgram}
							onChange={handleChange}
							required
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						>
							<option value="">Select an option</option>
							<option value="yes">Yes</option>
							<option value="no">No</option>
							<option value="planning">Planning to launch soon</option>
						</select>
					</div>

					{formData.existingAffiliateProgram === "yes" && (
						<div className="space-y-2">
							<Label htmlFor="affiliatePlatform">
								What platform do you use?
							</Label>
							<Input
								id="affiliatePlatform"
								name="affiliatePlatform"
								type="text"
								value={formData.affiliatePlatform}
								onChange={handleChange}
								placeholder="e.g., PartnerStack, Impact, Rewardful..."
								className="bg-background"
							/>
						</div>
					)}

					{/* Timeline */}
					<div className="space-y-2">
						<Label htmlFor="decisionTimeline">
							When are you looking to launch or join a partner program?
						</Label>
						<select
							id="decisionTimeline"
							name="decisionTimeline"
							value={formData.decisionTimeline}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						>
							<option value="">Select a timeframe</option>
							<option value="immediately">Immediately</option>
							<option value="this-quarter">This quarter</option>
							<option value="this-year">Later this year</option>
							<option value="exploring">Just exploring</option>
						</select>
					</div>

					{/* Marketing Angle */}
					<div className="space-y-2">
						<Label htmlFor="heardAbout">How did you hear about Affable?</Label>
						<select
							id="heardAbout"
							name="heardAbout"
							value={formData.heardAbout}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
						>
							<option value="">Select an option</option>
							<option value="referral">Referral</option>
							<option value="podcast">Podcast</option>
							<option value="social">Social Media</option>
							<option value="event">Event / Conference</option>
							<option value="search">Search Engine</option>
							<option value="other">Other</option>
						</select>
					</div>

					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Submitting..." : "Submit Request"}
					</Button>
				</form>
			</Card>

			{error && <p className="text-red-500">{error}</p>}
		</div>
	);
}
