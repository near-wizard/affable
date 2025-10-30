"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Search,
  Star,
  Users,
  TrendingUp,
  Award,
  ArrowUpRight,
  Mail,
  ExternalLink,
} from "lucide-react"

interface Partner {
  id: string
  name: string
  email: string
  tier: "standard" | "bronze" | "silver" | "gold" | "platinum"
  bio: string
  types: string[]
  campaigns: number
  conversions: number
  revenue: number
  rating: number
  verified: boolean
  website?: string
}

// Mock data - in production this would come from the API
const mockPartners: Partner[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@contentcreators.com",
    tier: "gold",
    bio: "Tech blogger with 500K+ monthly readers. Specializing in SaaS and productivity tools.",
    types: ["Content Creator", "Influencer"],
    campaigns: 24,
    conversions: 8530,
    revenue: 2500000,
    rating: 4.9,
    verified: true,
    website: "https://sarahsblog.com",
  },
  {
    id: "2",
    name: "TechFlow Community",
    email: "partnerships@techflowcommunity.com",
    tier: "platinum",
    bio: "Active community of 50K+ tech professionals. Curated content and exclusive deals for members.",
    types: ["Community", "Agency"],
    campaigns: 42,
    conversions: 15240,
    revenue: 4200000,
    rating: 4.8,
    verified: true,
    website: "https://techflowcommunity.com",
  },
  {
    id: "3",
    name: "Alex Rodriguez",
    email: "alex@marketingpros.com",
    tier: "silver",
    bio: "Digital marketing consultant. Helping B2B companies find the right tools.",
    types: ["Agency", "Consultant"],
    campaigns: 18,
    conversions: 4320,
    revenue: 980000,
    rating: 4.7,
    verified: true,
    website: "https://alexmarketing.com",
  },
  {
    id: "4",
    name: "Design Masters Hub",
    email: "hello@designmastershub.com",
    tier: "gold",
    bio: "Design education platform with 200K+ students. Premium design tools integration.",
    types: ["Community", "Educator"],
    campaigns: 31,
    conversions: 7180,
    revenue: 1850000,
    rating: 4.9,
    verified: true,
    website: "https://designmastershub.com",
  },
  {
    id: "5",
    name: "James Mitchell",
    email: "james@startupinsider.com",
    tier: "bronze",
    bio: "Startup advisor and newsletter writer. Weekly insights on growth tools.",
    types: ["Influencer", "Advisor"],
    campaigns: 12,
    conversions: 2150,
    revenue: 480000,
    rating: 4.6,
    verified: true,
    website: "https://startupinsider.com",
  },
  {
    id: "6",
    name: "Enterprise Partners Network",
    email: "partnerships@epnetwork.com",
    tier: "platinum",
    bio: "Network of 100+ enterprise consultants. Complex deal specialization.",
    types: ["Agency", "Reseller"],
    campaigns: 38,
    conversions: 12800,
    revenue: 3900000,
    rating: 4.8,
    verified: true,
    website: "https://epnetwork.com",
  },
]

const partnerTypes = ["All", "Content Creator", "Community", "Agency", "Influencer", "Advisor", "Educator", "Reseller"]

const tierBadgeColor = {
  standard: "bg-muted text-slate-800",
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-zinc-100 text-zinc-800",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
}

const tierStarCount = {
  standard: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
}

interface PartnerCardProps {
  partner: Partner
}

function PartnerCard({ partner }: PartnerCardProps) {
  return (
    <Card className="border border-border bg-background overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <div className="p-6">
        {/* Header with Tier Badge */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">{partner.name}</h3>
                {partner.verified && <Award className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{partner.email}</p>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${tierBadgeColor[partner.tier as keyof typeof tierBadgeColor]}`}>
              {partner.tier}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{partner.bio}</p>

          {/* Type Tags */}
          <div className="flex flex-wrap gap-2">
            {partner.types.map((type) => (
              <span
                key={type}
                className="inline-block px-2.5 py-1 bg-muted/30 border border-border rounded text-xs font-medium text-foreground"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="mb-4 p-3 bg-muted/20 border border-border rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Rating</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(partner.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">{partner.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Campaigns</div>
            <div className="text-lg font-bold text-foreground">{partner.campaigns}</div>
          </div>
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Conversions</div>
            <div className="text-lg font-bold text-foreground">{partner.conversions.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Revenue</div>
            <div className="text-lg font-bold text-foreground">${(partner.revenue / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mb-6 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">
            <span className="font-semibold">High performer</span> in their category
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          {partner.website && (
            <a href={partner.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit
              </Button>
            </a>
          )}
          <Link href={`/marketplace/partners/${partner.id}`} className="flex-1">
            <Button size="sm" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export function VendorMarketplace() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("All")

  const filteredPartners = mockPartners.filter((partner) => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.bio.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = selectedType === "All" || partner.types.includes(selectedType)

    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-background pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Discover High-Quality Affiliates
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Find verified partners and influencers to grow your affiliate program. Browse by category and rating.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-foreground mb-2">Search partners</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-foreground mb-3">Partner Type</label>
          <div className="flex flex-wrap gap-2">
            {partnerTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredPartners.length}</span> partner
            {filteredPartners.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Partner Grid */}
        {filteredPartners.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-3 bg-muted/20 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No partners found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search filters to find more partners
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSelectedType("All")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Info Section */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <Card className="border border-border bg-muted/20 p-6">
            <Award className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Verified Partners</h3>
            <p className="text-sm text-muted-foreground">
              All partners are verified and rated by previous vendors
            </p>
          </Card>
          <Card className="border border-border bg-muted/20 p-6">
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Proven Track Record</h3>
            <p className="text-sm text-muted-foreground">
              See real performance metrics and conversion rates
            </p>
          </Card>
          <Card className="border border-border bg-muted/20 p-6">
            <Users className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Diverse Expertise</h3>
            <p className="text-sm text-muted-foreground">
              Find partners across industries and audience types
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
