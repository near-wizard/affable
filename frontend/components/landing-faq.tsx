"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

interface FAQItem {
	question: string;
	answer: string;
}

const faqs: FAQItem[] = [
	{
		question: "How quickly can I launch my partner program?",
		answer:
			"You can have a fully functional partner program running in less than 24 hours. Our onboarding process is streamlined for founders who don't have dedicated operations teams. Most setups take 2-4 hours.",
	},
	{
		question: "What are the pricing and payment terms?",
		answer:
			"We offer flexible pricing starting from $25 one-time for beta users up to custom enterprise plans. We charge a combination of monthly fees and a small percentage of GMV (gross merchandise value) tracked through your program. No long-term contracts required.",
	},
	{
		question: "How accurate is the conversion tracking?",
		answer:
			"Our tracking is 99.9% accurate with advanced attribution modeling. We use multiple verification methods including client-side and server-side tracking, webhook validation, and fraud detection algorithms to ensure every conversion is properly credited.",
	},
	{
		question: "Can I integrate AffableLink with my existing systems?",
		answer:
			"Yes! AffableLink integrates with PostHog, Stripe, PayPal, and many other platforms. We also provide webhooks and a comprehensive REST API for custom integrations. Our SDK works with any JavaScript-based application.",
	},
	{
		question: "What kind of fraud detection do you have?",
		answer:
			"We employ advanced machine learning algorithms to detect suspicious patterns including impossible conversion velocities, geographic anomalies, device fingerprinting mismatches, and known fraud networks. Our fraud detection reduces false positives by 40%.",
	},
	{
		question: "Do you offer free trials or demos?",
		answer:
			"Yes! We offer a free 14-day trial with full access to all features. No credit card required. We also offer personalized demos for teams interested in enterprise plans. Contact our sales team to schedule.",
	},
	{
		question: "What happens if I outgrow the platform?",
		answer:
			"AffableLink is built to scale from startups to enterprises. As you grow, you can upgrade to higher tiers with additional features and higher GMV limits. Our enterprise plan is fully customizable for your needs.",
	},
	{
		question: "How is my data secured?",
		answer:
			"We maintain SOC 2 Type II compliance, use end-to-end encryption for sensitive data, and conduct regular security audits. Your data is stored redundantly across multiple geographic regions with automatic backups.",
	},
];

interface FAQItemProps {
	item: FAQItem;
}

function FAQItemComponent({ item }: FAQItemProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Card
			className="border border-border bg-background overflow-hidden transition-all duration-200 hover:bg-muted/50 transition-colors"
			onClick={() => setIsOpen(!isOpen)}
		>
			<button
				className="w-full px-6 py-4 flex items-center justify-between text-left"
				type="button"
			>
				<h3 className="font-semibold text-foreground">{item.question}</h3>
				<ChevronDown
					className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
						isOpen ? "transform rotate-180" : ""
					}`}
				/>
			</button>
			{isOpen && (
				<div className="border-t border-border px-6 py-4 bg-muted/20">
					<p className="text-muted-foreground leading-relaxed">{item.answer}</p>
				</div>
			)}
		</Card>
	);
}

export function LandingFAQ() {
	return (
		<section
			id="faq"
			className="border-b border-border bg-background py-24 sm:py-32"
		>
			<div className="mx-auto max-w-4xl px-6 lg:px-8">
				<div className="text-center mb-16">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance mb-4">
						Frequently asked questions
					</h2>
					<p className="text-lg text-muted-foreground">
						Everything you need to know about AffableLink
					</p>
				</div>

				<div className="grid gap-4">
					{faqs.map((faq, index) => (
						<FAQItemComponent key={index} item={faq} />
					))}
				</div>

				<div className="mt-12 text-center">
					<p className="text-muted-foreground mb-4">
						Have more questions? We're here to help.
					</p>
					<a
						href="mailto:hello@affablelink.com"
						className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
					>
						Get in touch →
					</a>
				</div>
			</div>
		</section>
	);
}
