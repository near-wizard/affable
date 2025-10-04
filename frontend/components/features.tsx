import { Card } from "@/components/ui/card"
import { TrendingUp, Users, DollarSign, Zap, Shield, BarChart } from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Tracking",
    description: "Monitor affiliate performance with live conversion tracking and attribution modeling.",
  },
  {
    icon: Users,
    title: "Affiliate Management",
    description: "Onboard, manage, and communicate with your affiliate partners from one dashboard.",
  },
  {
    icon: DollarSign,
    title: "Commission Automation",
    description: "Automatically calculate and process commissions based on your custom rules.",
  },
  {
    icon: Zap,
    title: "PostHog Native",
    description: "Built directly into PostHog—no data silos, no integration headaches.",
  },
  {
    icon: Shield,
    title: "Fraud Detection",
    description: "Advanced algorithms detect suspicious activity and protect your program.",
  },
  {
    icon: BarChart,
    title: "Advanced Analytics",
    description: "Deep insights into affiliate performance, ROI, and customer lifetime value.",
  },
]

export function Features() {
  return (
    <section className="border-b border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Everything you need to run a successful affiliate program
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Powerful features designed for growth teams who demand precision and scale.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <feature.icon className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
