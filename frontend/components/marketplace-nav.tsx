"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

interface MarketplaceNavProps {
  activeTab?: "campaigns" | "vendors"
}

export function MarketplaceNav({ activeTab = "campaigns" }: MarketplaceNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/marketplace" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            <span className="text-foreground">AffableLink</span>
          </Link>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Link href="/marketplace/campaigns">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "campaigns"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Find Campaigns
              </button>
            </Link>
            <Link href="/marketplace/vendors">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "vendors"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Find Affiliates
              </button>
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/desktop">
              <Button size="sm" variant="outline">
                Dashboard
              </Button>
            </Link>
            <Link href="/desktop">
              <Button size="sm">
                Launch
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-border">
            <div className="flex flex-col gap-3 pt-4">
              <Link
                href="/marketplace/campaigns"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "campaigns"
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                Find Campaigns
              </Link>
              <Link
                href="/marketplace/vendors"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "vendors"
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                Find Affiliates
              </Link>
              <div className="flex flex-col gap-2 px-4 pt-2 border-t border-border">
                <Link href="/desktop" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/desktop" onClick={() => setIsOpen(false)}>
                  <Button size="sm" className="w-full">
                    Launch
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
