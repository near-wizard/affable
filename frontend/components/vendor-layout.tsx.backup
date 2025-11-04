"use client"

import { useState, useEffect } from "react"
import { Menu, ChevronDown, LogOut, Settings, User, CreditCard, LayoutDashboard, DollarSign, Megaphone, Users } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { clearAuthCredentials, getUserEmail } from "@/lib/auth-utils"

interface MenuItem {
  name: string
  path?: string
  icon?: React.ReactNode
  children?: MenuItem[]
}

const links: MenuItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    children: [
      { name: "Overview", path: "/vendor/dashboard" },
    ],
  },
  {
    name: "Campaigns",
    icon: <Megaphone size={18} />,
    children: [
      { name: "All Campaigns", path: "/vendor/campaigns" },
    ],
  },
  {
    name: "Partners",
    icon: <Users size={18} />,
    children: [
      { name: "Current Partners", path: "/vendor/partners/current" },
      { name: "Find Partners", path: "/vendor/partners/find" },
    ],
  },
  {
    name: "Payouts",
    icon: <DollarSign size={18} />,
    children: [
      { name: "Pending Payments", path: "/vendor/payouts" },
      { name: "Payment History", path: "/vendor/payouts/history" },
    ],
  },
  {
    name: "Billing & Payments",
    icon: <CreditCard size={18} />,
    children: [
      { name: "Overview", path: "/vendor/billing" },
      { name: "Plans", path: "/vendor/billing/plans" },
      { name: "Payment Method", path: "/vendor/billing/payment" },
    ],
  },
]

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true) // default open
  const [expandedMenu, setExpandedMenu] = useState<string | null>("Dashboard") // default expand Dashboard
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setUserEmail(getUserEmail())
  }, [])

  const isMenuActive = (menu: MenuItem): boolean => {
    if (menu.path) return pathname === menu.path
    if (menu.children) {
      return menu.children.some((child) => pathname === child.path)
    }
    return false
  }

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName)
  }

  const handleSignOut = () => {
    clearAuthCredentials()
    router.push('/')
  }

  return (
    <div className="flex h-screen">
      {/* Optional overlay for small screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden transition-opacity duration-300"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-64 bg-card shadow-md z-50
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-64"}
        `}
      >
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <div className="flex justify-between items-start">
            <h2 className="font-bold text-lg">Vendor Menu</h2>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          {userEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User size={16} />
              <span className="truncate">{userEmail}</span>
            </div>
          )}
        </div>

        <nav className="p-4 flex flex-col space-y-2 flex-1">
          {links.map((link) => {
            const isActive = isMenuActive(link)

            if (link.children) {
              return (
                <div key={link.name}>
                  <button
                    onClick={() => toggleSubmenu(link.name)}
                    className={`w-full flex items-center justify-between p-2 rounded hover:bg-muted transition-colors ${
                      isActive ? "bg-primary/10 font-semibold text-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {link.icon && <span className="flex items-center justify-center">{link.icon}</span>}
                      <span>{link.name}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        expandedMenu === link.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedMenu === link.name && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.path}
                          href={child.path!}
                          className={`block p-2 rounded hover:bg-muted text-sm transition-colors ${
                            pathname === child.path
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-foreground"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={link.path}
                href={link.path!}
                className={`p-2 rounded hover:bg-muted transition-colors ${
                  isActive ? "bg-primary/10 font-semibold text-primary" : ""
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            )
          })}

          {/* Spacer to push buttons to bottom */}
          <div className="flex-1"></div>

          {/* Settings and Sign Out buttons */}
          <div className="border-t border-border pt-4 space-y-2">
            <Link
              href="/vendor/settings"
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-destructive/10 transition-colors text-destructive hover:text-destructive/80"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 pt-16 md:pt-0 ${
          isOpen ? "ml-64" : "ml-0"
        }`}
      >
        {/* Top bar */}
        <header className="p-4 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <button
              className="p-2 mr-4 rounded hover:bg-muted"
              onClick={() => setIsOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground">Vendor Page</h1>
              {userEmail && (
                <p className="text-sm text-muted-foreground">Welcome, {userEmail}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded hover:bg-destructive/10 transition-colors text-destructive hover:text-destructive/80 font-medium"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0 bg-background">{children}</main>
      </div>
    </div>
  )
}
