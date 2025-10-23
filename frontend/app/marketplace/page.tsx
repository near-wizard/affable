import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MarketplaceNav } from "@/components/marketplace-nav"
import { ArrowRight, Zap, Users } from "lucide-react"

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm mb-6">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Discover & Connect</span>
          </div>

          <h1 className="text-5xl font-bold text-foreground mb-6">
            The AffableLink Marketplace
          </h1>

          <p className="text-xl text-muted-foreground mb-10">
            Whether you're looking to grow your affiliate program or find the perfect campaign to promote,
            AffableLink Marketplace connects you with the right partners.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace/campaigns">
              <Button size="lg" className="group">
                Browse Campaigns
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/marketplace/vendors">
              <Button size="lg" variant="outline">
                Find Affiliates
              </Button>
            </Link>
          </div>
        </div>

        {/* Two Column Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* For Partners */}
          <div className="space-y-6">
            <div className="inline-block">
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">For Partners</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Find campaigns that match your audience
            </h2>
            <p className="text-lg text-muted-foreground">
              Browse curated affiliate and referral programs. Filter by commission structure, category, and performance metrics. Apply to programs and start earning commissions instantly.
            </p>
            <ul className="space-y-3">
              {[
                "Search 500+ active campaigns",
                "View real performance data",
                "Filter by commission & category",
                "Apply with one click",
                "Real-time earnings tracking",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/marketplace/campaigns">
              <Button size="lg" variant="outline">
                Explore Campaigns
              </Button>
            </Link>
          </div>

          {/* Card Visual */}
          <Card className="border border-border bg-muted/20 p-8 space-y-4">
            <div className="space-y-3">
              {[
                { name: "TechFlow Pro", commission: "25%", category: "SaaS" },
                { name: "DataViz Studio", commission: "20%", category: "Analytics" },
                { name: "SecureVault", commission: "$150", category: "Security" },
              ].map((campaign) => (
                <div
                  key={campaign.name}
                  className="p-4 bg-background rounded-lg border border-border/50 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground text-sm">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">{campaign.category}</div>
                  </div>
                  <div className="font-bold text-primary">{campaign.commission}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* For Vendors */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* Card Visual */}
          <Card className="border border-border bg-muted/20 p-8 space-y-4 order-2 md:order-1">
            <div className="space-y-3">
              {[
                { name: "Sarah Chen", tier: "Gold", campaigns: "24" },
                { name: "TechFlow Community", tier: "Platinum", campaigns: "42" },
                { name: "Design Masters Hub", tier: "Gold", campaigns: "31" },
              ].map((partner) => (
                <div
                  key={partner.name}
                  className="p-4 bg-background rounded-lg border border-border/50 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground text-sm">{partner.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{partner.tier} • {partner.campaigns} campaigns</div>
                  </div>
                  <Users className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
          </Card>

          {/* For Vendors Text */}
          <div className="space-y-6 order-1 md:order-2">
            <div className="inline-block">
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">For Vendors</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Recruit top-performing affiliates
            </h2>
            <p className="text-lg text-muted-foreground">
              Discover verified partners with proven track records. Browse by expertise, performance, and audience size. Invite partners to your campaigns and manage everything in one dashboard.
            </p>
            <ul className="space-y-3">
              {[
                "Browse 1,000+ verified partners",
                "View detailed performance metrics",
                "Filter by expertise & tier",
                "One-click partner invitations",
                "Built-in approval workflow",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/marketplace/vendors">
              <Button size="lg" variant="outline">
                Find Affiliates
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <Card className="border border-border bg-muted/20 p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <div className="text-sm text-muted-foreground">Active Campaigns</div>
          </Card>
          <Card className="border border-border bg-muted/20 p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">1000+</div>
            <div className="text-sm text-muted-foreground">Verified Partners</div>
          </Card>
          <Card className="border border-border bg-muted/20 p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">$5B+</div>
            <div className="text-sm text-muted-foreground">Annual GMV</div>
          </Card>
          <Card className="border border-border bg-muted/20 p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Tracking Accuracy</div>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="border border-border bg-gradient-to-r from-primary/10 to-primary/5 p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of partners and vendors using AffableLink to grow their businesses.
          </p>
          <Link href="/desktop">
            <Button size="lg">
              Launch Your Program
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}
