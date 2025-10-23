import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"

export function LandingSocialProof() {
  const testimonials = [
    {
      quote: "AffableLink cut our affiliate setup time from weeks to days. The founder-friendly approach is exactly what we needed.",
      author: "Sarah Chen",
      role: "VP of Partnerships",
      company: "TechCorp",
    },
    {
      quote: "Real-time tracking and fraud detection give us confidence in our partner program. Best decision we've made.",
      author: "Michael Rodriguez",
      role: "CEO",
      company: "GrowthStart",
    },
    {
      quote: "The commission automation alone has saved us hundreds of hours in manual processing. Highly recommend.",
      author: "Emily Watson",
      role: "Operations Lead",
      company: "SalesPro",
    },
  ]

  const trustedBy = [
    "Tech Startups",
    "B2B SaaS",
    "E-commerce Brands",
    "Agencies",
    "Content Creators",
    "Enterprise",
  ]

  return (
    <section className="border-b border-border bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Trusted By Section */}
        <div className="mb-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
            Trusted by forward-thinking teams
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 max-w-4xl mx-auto">
            {trustedBy.map((item) => (
              <div
                key={item}
                className="px-4 py-3 rounded-lg border border-border bg-background/50 text-sm font-medium text-foreground text-center"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance mb-4">
            Love from our users
          </h2>
          <p className="text-lg text-muted-foreground">
            Join companies scaling their partner programs with confidence
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border border-border bg-background p-6 flex flex-col">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground mb-6 flex-grow text-sm leading-relaxed italic">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-border pt-4">
                <div className="font-semibold text-foreground text-sm">{testimonial.author}</div>
                <div className="text-xs text-muted-foreground">
                  {testimonial.role} at {testimonial.company}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-4xl mx-auto mt-16">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">500+</div>
            <div className="text-sm text-muted-foreground">Active Programs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">$2B+</div>
            <div className="text-sm text-muted-foreground">GMV Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">Support</div>
          </div>
        </div>
      </div>
    </section>
  )
}
