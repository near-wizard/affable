import { LandingNav } from "@/components/landing-nav";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Benefits } from "@/components/benefits";
import { LandingSocialProof } from "@/components/landing-social-proof";
import { LandingFAQ } from "@/components/landing-faq";
import { LandingCTA } from "@/components/landing-cta";
import { LandingFooter } from "@/components/landing-footer";

export default function LandingPage() {
	return (
		<main className="min-h-screen flex flex-col">
			<LandingNav />
			<div className="flex-1">
				<Hero />
				<Features />
				<Benefits />
				<LandingSocialProof />
				<LandingFAQ />
				<LandingCTA />
				<a href="https://localhost:8000/r/4qPkxV94">
					https://localhost:8000/r/4qPkxV94
				</a>
			</div>
			<LandingFooter />
		</main>
	);
}
