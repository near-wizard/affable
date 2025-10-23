"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  vendor: string
  description: string
  commissionType: "percentage" | "flat"
  commissionValue: number
  partnerCount: number
  conversions: number
  revenue: number
  conversionRate: number
  category: string
  approved: boolean
}

// Mock data - in production this would come from the API
const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "TechFlow Pro - Annual License",
    vendor: "TechFlow Inc",
    description: "Premium project management tool for remote teams. Industry-leading automation.",
    commissionType: "percentage",
    commissionValue: 25,
    partnerCount: 1240,
    conversions: 8530,
    revenue: 2500000,
    conversionRate: 3.2,
    category: "SaaS",
    approved: true,
  },
  {
    id: "2",
    name: "DataViz Studio - Monthly Subscription",
    vendor: "DataViz Corp",
    description: "Real-time data visualization platform for enterprises. Beautiful dashboards.",
    commissionType: "percentage",
    commissionValue: 20,
    partnerCount: 856,
    conversions: 5240,
    revenue: 1800000,
    conversionRate: 2.8,
    category: "Analytics",
    approved: true,
  },
  {
    id: "3",
    name: "SecureVault - Enterprise Plan",
    vendor: "SecureVault Ltd",
    description: "End-to-end encrypted password management for organizations.",
    commissionType: "flat",
    commissionValue: 150,
    partnerCount: 650,
    conversions: 3120,
    revenue: 1200000,
    conversionRate: 2.1,
    category: "Security",
    approved: true,
  },
  {
    id: "4",
    name: "CloudHost Pro - Yearly Plan",
    vendor: "CloudHost Systems",
    description: "Scalable cloud hosting with 99.99% uptime guarantee.",
    commissionType: "percentage",
    commissionValue: 15,
    partnerCount: 2100,
    conversions: 12500,
    revenue: 4200000,
    conversionRate: 3.8,
    category: "Infrastructure",
    approved: true,
  },
  {
    id: "5",
    name: "MarketingAI - Professional Plan",
    vendor: "MarketingAI Tech",
    description: "AI-powered marketing automation platform for B2B companies.",
    commissionType: "percentage",
    commissionValue: 30,
    partnerCount: 945,
    conversions: 6870,
    revenue: 1950000,
    conversionRate: 2.9,
    category: "Marketing",
    approved: true,
  },
  {
    id: "6",
    name: "DesignPro - Studio License",
    vendor: "DesignPro Software",
    description: "Professional design tool for agencies and freelancers.",
    commissionType: "percentage",
    commissionValue: 18,
    partnerCount: 540,
    conversions: 2890,
    revenue: 950000,
    conversionRate: 2.4,
    category: "Design",
    approved: true,
  },
]

const categories = ["All", "SaaS", "Analytics", "Security", "Infrastructure", "Marketing", "Design"]

interface CampaignCardProps {
  campaign: Campaign
}

function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Card className="border border-border bg-background overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">{campaign.name}</h3>
              <p className="text-sm text-muted-foreground">{campaign.vendor}</p>
            </div>
            <span className="inline-block px-3 py-1 bg-muted/30 rounded-full text-xs font-medium text-foreground">
              {campaign.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</p>
        </div>

        {/* Commission Badge */}
        <div className="mb-4 p-3 bg-muted/20 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Commission</span>
            <span className="text-lg font-bold text-primary">
              {campaign.commissionType === "percentage"
                ? `${campaign.commissionValue}%`
                : `$${campaign.commissionValue.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Partners</div>
            <div className="text-lg font-bold text-foreground">{campaign.partnerCount.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Conversions</div>
            <div className="text-lg font-bold text-foreground">{campaign.conversions.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Conv. Rate</div>
            <div className="text-lg font-bold text-foreground">{campaign.conversionRate}%</div>
          </div>
        </div>

        {/* Conversion Trend */}
        <div className="mb-6 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">
            <span className="font-semibold">${(campaign.revenue / 1000000).toFixed(1)}M</span> GMV tracked
          </span>
        </div>

        {/* CTA */}
        <Link href={`/marketplace/campaigns/${campaign.id}`}>
          <Button className="w-full" size="sm">
            View Details & Apply
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function CampaignMarketplace() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showFilters, setShowFilters] = useState(false)

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === "All" || campaign.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Discover Partner Programs
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Find the best affiliate and referral programs to promote. Earn commissions from brands you love.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">Search campaigns</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, vendor, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden px-4 py-3 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Category Filter */}
        <div className={`mb-8 ${showFilters ? "block" : "hidden md:block"}`}>
          <label className="block text-sm font-medium text-foreground mb-3">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredCampaigns.length}</span> campaign
            {filteredCampaigns.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Campaign Grid */}
        {filteredCampaigns.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-3 bg-muted/20 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search filters to find more programs
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("All")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Info Section */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <Card className="border border-border bg-muted/20 p-6">
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Growing Opportunities</h3>
            <p className="text-sm text-muted-foreground">
              Join programs with proven track records and growing conversion rates
            </p>
          </Card>
          <Card className="border border-border bg-muted/20 p-6">
            <Users className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Active Communities</h3>
            <p className="text-sm text-muted-foreground">
              Network with thousands of partners in each program
            </p>
          </Card>
          <Card className="border border-border bg-muted/20 p-6">
            <DollarSign className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Competitive Payouts</h3>
            <p className="text-sm text-muted-foreground">
              Earn competitive commissions with real-time tracking and instant payouts
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
