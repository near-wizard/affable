export function AboutContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">About Affable</h2>
      <p className="text-foreground/80 leading-relaxed">
        Affable is a powerful affiliate marketing management integration for PostHog that brings comprehensive tracking
        and management directly into your analytics dashboard.
      </p>
      <p className="text-foreground/80 leading-relaxed">
        Built for modern product teams, Affable seamlessly connects your affiliate program with PostHog's robust
        analytics platform, giving you unprecedented visibility into your affiliate marketing performance.
      </p>

      <div className="bg-muted p-4 rounded border border-border mt-6">
        <h3 className="font-semibold text-foreground mb-2">Why Choose Affable?</h3>
        <ul className="space-y-2 text-sm text-foreground/80">
          <li>✓ Native PostHog integration - no data silos</li>
          <li>✓ Real-time affiliate performance tracking</li>
          <li>✓ Automated commission calculations</li>
          <li>✓ Advanced fraud detection</li>
          <li>✓ Custom attribution models</li>
        </ul>
      </div>
    </div>
  )
}
