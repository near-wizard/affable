import { Card } from "@/components/ui/card"

const stats = [
  { value: "3x", label: "Faster onboarding", description: "Get affiliates up and running in minutes" },
  { value: "99.9%", label: "Tracking accuracy", description: "Never miss a conversion with reliable attribution" },
  { value: "40%", label: "Lower fraud rates", description: "Advanced detection keeps your program clean" },
  { value: "24/7", label: "Real-time sync", description: "Always in sync with your PostHog data" },
]

export function Benefits() {
  return (
    <section className="border-b border-border bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Built for teams that move fast
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Join forward-thinking companies already scaling their partner programs with confidence.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-border bg-card p-6 text-center">
              <div className="text-4xl font-bold text-primary">{stat.value}</div>
              <div className="mt-2 text-sm font-semibold text-card-foreground">{stat.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.description}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
