"use client";

import { usePathname } from "next/navigation";
import { useSafeArea } from "@/hooks/use-safe-area";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MobileHeaderProps {
  onMenuToggle?: () => void;
  title?: string;
}

export function MobileHeader({ onMenuToggle, title }: MobileHeaderProps) {
  const pathname = usePathname();
  const safeArea = useSafeArea();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine if header should be visible
  const isDashboard =
    pathname.includes("/partner/") ||
    pathname.includes("/admin/") ||
    pathname.includes("/vendor/");

  if (!isDashboard) return null;

  const getPageTitle = () => {
    if (title) return title;

    if (pathname.includes("/partner/links")) return "My Links";
    if (pathname.includes("/partner/earnings")) return "Earnings";
    if (pathname.includes("/partner/dashboard")) return "Dashboard";
    if (pathname.includes("/admin/dashboard")) return "Admin";
    if (pathname.includes("/vendor/dashboard")) return "Vendor";
    if (pathname.includes("/vendor/campaigns")) return "Campaigns";
    if (pathname.includes("/vendor/partners")) return "Partners";
    if (pathname.includes("/vendor/payouts")) return "Payouts";

    return "AffableLink";
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    onMenuToggle?.();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 md:hidden bg-[oklch(0.92_0.03_75)] border-b-2 border-[oklch(0.7_0.05_55)] z-40"
      style={{
        paddingTop: `${safeArea.top}px`,
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 safe-px">
        <h1 className="text-lg font-bold text-[oklch(0.55_0.12_35)]">
          {getPageTitle()}
        </h1>
        <button
          onClick={handleMenuToggle}
          className="p-2 hover:bg-[oklch(0.85_0.04_65)] rounded-lg transition-colors duration-200 touch-manipulation"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="w-5 h-5 text-[oklch(0.45_0.05_45)]" />
          ) : (
            <Menu className="w-5 h-5 text-[oklch(0.45_0.05_45)]" />
          )}
        </button>
      </div>
    </header>
  );
}
