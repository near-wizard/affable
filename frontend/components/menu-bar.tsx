"use client"

import { useState, useRef, useEffect } from "react"
import { Timer } from "./timer"

interface MenuBarProps {
  onWindowOpen?: (windowType: string) => void
}

export function MenuBar({ onWindowOpen }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const menus = [
    {
      id: "affable",
      label: "Affable",
      items: [
        { label: "About Affable", action: "about" },
        { label: "Get Started", action: "get-started" },
        { label: "Exit", action: null },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Features", action: "features" },
        { label: "Pricing", action: "pricing" },
      ],
    },
    {
      id: "oss",
      label: "OSS",
      items: [
        { label: "GitHub Repo", url: "https://github.com/near-wizard/affable" },
        { label: "Roadmap", url: "https://github.com/users/near-wizard/projects/1/views/1" },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Documentation", action: "about" },
        { label: "Contact Support", action: "get-started" },
      ],
    },
  ]

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId)
  }

  const handleItemClick = (item: { action?: string | null; url?: string }) => {
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer")
    } else if (item.action && onWindowOpen) {
      onWindowOpen(item.action)
    }
    setActiveMenu(null)
  }

  return (
    <div
      ref={menuRef}
      className="h-8 border-b-2 border-[oklch(0.60_0.06_50)] flex items-center px-2 gap-1 shadow-[inset_0_1px_0_0_oklch(0.85_0.04_65)] bg-[oklch(0.72_0.05_55)] relative z-50"
    >
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            className={`px-3 py-0.5 text-sm font-sans transition-colors rounded-sm ${
              activeMenu === menu.id
                ? "bg-[oklch(0.48_0.10_30)] text-[oklch(0.98_0.01_75)]"
                : "text-[oklch(0.30_0.04_45)] hover:bg-[oklch(0.48_0.10_30)] hover:text-[oklch(0.98_0.01_75)]"
            }`}
            onClick={() => handleMenuClick(menu.id)}
          >
            {menu.label}
          </button>

          {activeMenu === menu.id && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[180px] bg-[oklch(0.82_0.04_65)] border-2 border-[oklch(0.60_0.06_50)] shadow-[2px_2px_0_0_oklch(0.40_0.06_45)] rounded-sm">
              {menu.items.map((item, index) => (
                <button
                  key={index}
                  className="w-full text-left px-4 py-2 text-sm text-[oklch(0.30_0.04_45)] hover:bg-[oklch(0.48_0.10_30)] hover:text-[oklch(0.98_0.01_75)] transition-colors first:rounded-t-sm last:rounded-b-sm"
                  onClick={() => handleItemClick(item)}
                >
                  {item.label}
                  {item.url && <span className="ml-1" aria-hidden="true">↗</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="ml-auto flex items-center gap-2 text-xs">
        <Timer />
      </div>
    </div>
  )
}
