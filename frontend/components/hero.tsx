import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3 } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">PostHog Integration</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl text-balance">
            Track and optimize your affiliate marketing with <span className="text-primary">PostHog analytics</span>
          </h1>

          <p className="mb-10 text-lg leading-relaxed text-muted-foreground sm:text-xl text-pretty">
            The complete partner management solution built for PostHog. Monitor conversions, track commissions, and
            scale your partner program with real-time analytics.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="group">
              Get Early Access
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
