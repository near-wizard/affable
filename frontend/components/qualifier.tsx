import { Card } from "@/components/ui/card";
import Link from "next/link";

const stats = [
	{
		emoji: "💰",
		value: "$1K+ MRR",
		label: "Paying users",
		description:
			"You already have real subscribers — your growth is ready to scale",
		featured: true, // standout card
	},
	{
		emoji: "💳",
		value: "Subscription-based",
		label: "Recurring revenue",
		description:
			"You sell software with recurring payments — Stripe makes this seamless",
	},
	{
		emoji: "🎯",
		value: "Product-Led Growth",
		label: "Self-serve sales",
		description:
			"Your users can buy and upgrade on their own — no human in the middle",
	},
	{
		emoji: "📢",
		value: "Already marketing",
		label: "Amplify your efforts",
		description:
			"You’re already promoting your product — we make your word-of-mouth growth explode",
	},
];

export function Qualifier() {
	return (
		<section className="border-b border-border bg-muted/30 py-24 sm:py-32">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
						Do you qualify for our{" "}
						<Link href="#">
							<span className="text-primary font-bold underline">
								Early Access
							</span>
						</Link>
						?
					</h2>
					<p className="mt-4 text-lg text-muted-foreground text-pretty">
						You don’t need to check every box — just make sure you’re building a
						subscription SaaS and care about growing through your users.
					</p>
				</div>

				<div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{stats.map((stat) => (
						<Card
							key={stat.label}
							className="border border-border bg-card p-8 text-center min-h-[200px] flex flex-col justify-center
                                   transform transition duration-300 hover:scale-105"
						>
							<div className="flex items-center justify-center text-xl font-bold text-primary whitespace-nowrap">
								<span className="mr-2 items-center">{stat.emoji}</span>
								{stat.value}
							</div>
							<div className="mt-4 text-sm font-semibold text-card-foreground">
								{stat.label}
							</div>
							<div className="mt-2 text-xs text-muted-foreground">
								{stat.description}
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
