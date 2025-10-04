export function FeaturesContent() {
  const features = [
    {
      title: "Real-Time Analytics",
      description: "Track affiliate performance in real-time with PostHog's powerful analytics engine.",
    },
    {
      title: "Commission Management",
      description: "Automated commission calculations and payout tracking for all your affiliates.",
    },
    {
      title: "Fraud Detection",
      description: "Advanced algorithms to detect and prevent affiliate fraud before it impacts your bottom line.",
    },
    {
      title: "Custom Attribution",
      description:
        "Flexible attribution models to match your business needs - first-click, last-click, or multi-touch.",
    },
    {
      title: "Affiliate Dashboard",
      description: "Give your affiliates access to their own performance dashboard with real-time stats.",
    },
    {
      title: "Deep Linking",
      description: "Generate and track custom deep links for any page or product in your application.",
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Features</h2>
      <div className="grid gap-4">
        {features.map((feature, index) => (
          <div key={index} className="bg-muted p-4 rounded border border-border hover:border-primary transition-colors">
            <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-foreground/70">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
