import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Megaphone, DollarSign } from "lucide-react";

export function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-border bg-background pt-24 sm:pt-32">
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

			<div className="relative mx-auto max-w-7xl px-6 pb-24 sm:pb-32 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<div
						className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm 
                transition-colors duration-300 hover:bg-primary-dark hover:text-slate-200"
					>
						<Megaphone className="h-4 w-4 text-primary transition-colors duration-300 group-hover:text-white" />
						<span className="text-muted-foreground transition-colors duration-300 group-hover:text-white">
							Generate trust, not spam
						</span>
					</div>

					<div
						className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm
                transition-colors duration-300 hover:bg-accent hover:text-white"
					>
						<Zap className="h-4 w-4 text-primary transition-colors duration-300 group-hover:text-white" />
						<span className="text-muted-foreground transition-colors duration-300 group-hover:text-white">
							Launch in under 24 hours
						</span>
					</div>

					<div
						className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm
                transition-colors duration-300 hover:bg-secondary hover:text-white"
					>
						<DollarSign className="h-4 w-4 text-primary transition-colors duration-300 group-hover:text-white" />
						<span className="text-muted-foreground transition-colors duration-300 group-hover:text-white">
							Only pay for performance
						</span>
					</div>

					<h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl text-balance">
						Turn your <span className="text-primary">users</span> into your{" "}
						<span className="text-primary">growth engine</span>
					</h1>

					<p className="mb-10 text-lg leading-relaxed text-muted-foreground sm:text-xl text-pretty">
						For bootstrapped SaaS and microSaaS founders who want to grow
						through word-of-mouth,{" "}
						<span className="text-primary font-bold">Affable</span> is a
						referral and advocacy engine that turns users into loyal advocates
					</p>

					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Link href="https://forms.gle/pNzSb5knWpV6eSFP7" target="_blank">
							<Button size="lg" className="group">
								Get Started Free
								<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
						</Link>
						<Link href="/demo">
							<Button size="lg" variant="outline">
								View Platform
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
