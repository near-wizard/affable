import { CampaignMarketplace } from "@/components/campaign-marketplace"
import { MarketplaceNav } from "@/components/marketplace-nav"
import { LandingFooter } from "@/components/landing-footer"

export const metadata = {
  title: "Find Affiliate Campaigns - AffableLink Marketplace",
  description: "Discover and join the best affiliate and referral programs. Browse 500+ campaigns with real-time performance metrics.",
}

export default function CampaignsPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <MarketplaceNav activeTab="campaigns" />
      <div className="flex-1">
        <CampaignMarketplace />
      </div>
      <LandingFooter />
    </main>
  )
}
