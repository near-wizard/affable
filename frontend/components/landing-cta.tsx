import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function LandingCTA() {
	return (
		<section className="border-b border-border bg-background py-24 sm:py-32">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance mb-6">
						Turn your customers into your advocates
					</h2>
					<p className="text-lg text-muted-foreground text-pretty mb-10">
						Get your affiliate program running in minutes.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link href="/desktop">
							<Button size="lg" className="group">
								Start Free Today
								<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
						</Link>
						<Link href="/desktop">
							<Button size="lg" variant="outline">
								Schedule Demo
							</Button>
						</Link>
					</div>
					<p className="mt-6 text-sm text-muted-foreground">
						No credit card required. Takes less than 5 minutes to set up.
					</p>
				</div>
			</div>
		</section>
	);
}
