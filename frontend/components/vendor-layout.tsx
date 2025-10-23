"use client"

import { useState } from "react"
import { Menu, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MenuItem {
  name: string
  path?: string
  children?: MenuItem[]
}

const links: MenuItem[] = [
  { name: "Dashboard", path: "/vendor/dashboard" },
  { name: "Campaigns", path: "/vendor/campaigns" },
  {
    name: "Partners",
    children: [
      { name: "Current Partners", path: "/vendor/partners/current" },
      { name: "Find Partners", path: "/vendor/partners/find" },
    ],
  },
  { name: "Payouts", path: "/vendor/payouts" },
]

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true) // default open
  const [expandedMenu, setExpandedMenu] = useState<string | null>("Partners") // default expand Partners
  const pathname = usePathname()

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
          fixed top-0 left-0 bottom-0 w-64 bg-white shadow-md z-50
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-64"}
        `}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg">Vendor Menu</h2>
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="p-4 flex flex-col space-y-2">
          {links.map((link) => {
            const isActive = isMenuActive(link)

            if (link.children) {
              return (
                <div key={link.name}>
                  <button
                    onClick={() => toggleSubmenu(link.name)}
                    className={`w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 transition-colors ${
                      isActive ? "bg-gray-200 font-semibold" : ""
                    }`}
                  >
                    <span>{link.name}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        expandedMenu === link.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedMenu === link.name && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-300 pl-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.path}
                          href={child.path!}
                          className={`block p-2 rounded hover:bg-gray-100 text-sm transition-colors ${
                            pathname === child.path
                              ? "bg-gray-200 font-semibold text-gray-900"
                              : "text-gray-700"
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
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                  isActive ? "bg-gray-200 font-semibold" : ""
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 pt-16 md:pt-0 ${
          isOpen ? "ml-64" : "ml-0"
        }`}
      >
        {/* Top bar */}
        <header className="p-4 bg-white border-b border-gray-300 flex items-center">
          <button
            className="p-2 mr-4 rounded hover:bg-gray-200"
            onClick={() => setIsOpen(true)}
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold">Vendor Page</h1>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  )
}
