import { DemoNetwork } from "../networkgraph";

export function AboutContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">About Affable</h2>
      <p className="text-foreground/80 leading-relaxed">
        Affable is a powerful partner relationship management platform that brings comprehensive tracking
        and management directly into your analytics dashboard.
      </p>
      <p className="text-foreground/80 leading-relaxed">
        <strong>PartnerStack</strong> and <strong>Impact</strong> use expensive, high-touch enterprise pricing models that create friction. <strong>PartnerStack’s own FAQ</strong> cites an <strong>average onboarding time</strong> of <strong>74 days</strong>, while <strong>Impact claims under 30 days</strong>.
      </p>
      <p className="text-foreground/80 leading-relaxed">
        By contrast, <strong>Affable Link</strong> aims to be self-serve, with automated onboarding flows and documentation—no manual gatekeeping. Our goal is to have users live and <strong>launching their first campaign within 24 hours</strong>, not days or weeks.
      </p>
      <p className="text-foreground/80 leading-relaxed">
      We want a Product Hunt–validated startup with early traction (e.g., ~$1K/month revenue) to be able to blitzscale with Affable Link, built to be <i>startup-friendly</i> from day one.
      </p>

      <div className="bg-muted p-4 rounded border border-border mt-6">
        <h3 className="font-semibold text-foreground mb-2">Why Choose Affable?</h3>
        <ul className="space-y-2 text-sm text-foreground/80">
          <li>✓ Real-time partner performance tracking</li>
          <li>✓ Automated commission calculations</li>
          <li>✓ Advanced fraud detection</li>
          <li>✓ Custom attribution models</li>
          <li>✓ Lightning-fast, self-serve onboarding</li>
        </ul>
      </div>
      <DemoNetwork />
    </div>
  )
}