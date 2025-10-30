"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { name: "Dashboard", path: "/admin/dashboard" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true) // default open
  const pathname = usePathname()

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
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="font-bold text-lg">Admin Menu</h2>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="p-4 flex flex-col space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.path
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`p-2 rounded hover:bg-muted ${
                  isActive ? "bg-muted font-semibold" : ""
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
        <header className="p-4 bg-white border-b border-border flex items-center">
          <button
            className="p-2 mr-4 rounded hover:bg-muted"
            onClick={() => setIsOpen(true)}
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold">Admin Page</h1>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  )
}
