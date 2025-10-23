import { VendorMarketplace } from "@/components/vendor-marketplace"
import { MarketplaceNav } from "@/components/marketplace-nav"
import { LandingFooter } from "@/components/landing-footer"

export const metadata = {
  title: "Find Affiliate Partners - AffableLink Marketplace",
  description: "Discover verified affiliate partners and influencers. Browse 1,000+ partners with performance metrics and ratings.",
}

export default function VendorsPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <MarketplaceNav activeTab="vendors" />
      <div className="flex-1">
        <VendorMarketplace />
      </div>
      <LandingFooter />
    </main>
  )
}
