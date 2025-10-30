import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import Link from "next/link";

export function LandingSocialProof() {
	const testimonials = [
		{
			quote:
				"I swear, I blinked and our first referral campaign was live. AffableLink went from what I expected to be a 2 month slog onboarding with PartnerStack to under an hour. This is basically wizardry disguised as software!",
			author: "Michael Rodriguez",
			role: "Founder/CEO",
			company: "Cara Libro",
		},
		{
			quote:
				"Performance-based pricing gave us confidence from day one. We launched our program and earned out our commitment credit within the first week — a smart choice for bootstrapped founders who don’t want to burn money on ads that might not deliver real results.",
			author: "Sarah Chen",
			role: "Operations Lead",
			company: "D'Elite Consulting",
		},
		{
			quote:
				"I am absolutely over the moon! Setting up our referral program was effortless and our campaigns led to real conversions. What I didn't expect was how giddy I was seeing our users spreading our brand and sharing glowing testimonials. AffableLink turned growth into pure joy!",
			author: "Emily Watson",
			role: "Group Channel Manager - Refferal Programs",
			company: "MacroHard",
		},
	];

	const trustedByLogos = [
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		// Line 2
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
		{
			src: "/images/logos/affablelink.png",
			companyName: "Affable Link",
			link: "https://affablelink.com/",
		},
	];

	return (
		<section className="border-b border-border bg-muted/30 py-24 sm:py-32">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				{/* Trusted By Section */}
				<div className="mb-16 text-center">
					<p className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
						Trusted by forward-thinking teams
					</p>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 max-w-4xl mx-auto items-center">
						{trustedByLogos.map((logo, i) => (
							<Link
								key={logo.companyName + i}
								href={logo.link}
								className="inline-block w-full" // ensures link fills the grid cell
							>
								<div className="flex items-center justify-center p-4 bg-background/50 rounded-lg border border-border w-auto h-auto">
									<img
										src={logo.src}
										alt={logo.companyName}
										className="max-h-12 object-contain"
									/>
									<span className="ml-2 text-md font-bold">
										{logo.companyName}
									</span>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Testimonials */}
				<div className="mx-auto max-w-2xl text-center mb-12">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance mb-4">
						Love from our users (Mock)
					</h2>
					<p className="text-lg text-muted-foreground">
						Join companies scaling their partner programs with confidence
					</p>
				</div>

				<div className="grid gap-8 max-w-4xl mx-auto md:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<Card
							key={index}
							className="border border-border bg-background p-6 flex flex-col"
						>
							<div className="flex gap-1 mb-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<Star key={i} className="h-5 w-5 fill-primary text-primary" />
								))}
							</div>
							<p className="text-foreground mb-6 flex-grow text-sm leading-relaxed italic">
								"{testimonial.quote}"
							</p>
							<div className="border-t border-border pt-4">
								<div className="font-semibold text-foreground text-sm">
									{testimonial.author}
								</div>
								<div className="text-xs text-muted-foreground">
									{testimonial.role} at {testimonial.company}
								</div>
							</div>
						</Card>
					))}
				</div>

				{/* Stats */}
				<div className="grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-4xl mx-auto mt-16">
					<div className="text-center">
						<div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
							500+
						</div>
						<div className="text-sm text-muted-foreground">Active Programs</div>
					</div>
					<div className="text-center">
						<div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
							$2B+
						</div>
						<div className="text-sm text-muted-foreground">GMV Tracked</div>
					</div>
					<div className="text-center">
						<div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
							99.9%
						</div>
						<div className="text-sm text-muted-foreground">Uptime</div>
					</div>
					<div className="text-center">
						<div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
							24/7
						</div>
						<div className="text-sm text-muted-foreground">Support</div>
					</div>
				</div>
			</div>
		</section>
	);
}
