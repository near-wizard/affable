"use client";

import { Home, Link2, TrendingUp, BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSafeArea } from "@/hooks/use-safe-area";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activePatterns: string[];
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    activePatterns: ["/$", "/[slug]"],
  },
  {
    label: "Links",
    href: "/partner/links",
    icon: Link2,
    activePatterns: ["/partner/links"],
  },
  {
    label: "Earnings",
    href: "/partner/earnings",
    icon: TrendingUp,
    activePatterns: ["/partner/earnings"],
  },
  {
    label: "Academy",
    href: "/academy",
    icon: BookOpen,
    activePatterns: ["/academy"],
  },
  {
    label: "Settings",
    href: "/partner/dashboard",
    icon: Settings,
    activePatterns: ["/partner/dashboard", "/admin/dashboard", "/vendor/dashboard"],
  },
];

interface MobileNavBarProps {
  showOn?: "landing" | "dashboard" | "all";
}

export function MobileNavBar({ showOn = "dashboard" }: MobileNavBarProps) {
  const pathname = usePathname();
  const safeArea = useSafeArea();

  // Determine if nav should be visible
  const isLanding = pathname === "/" || pathname.match(/^\/[a-z-]+(?:\/.*)?$/);
  const isDashboard =
    pathname.includes("/partner/") ||
    pathname.includes("/admin/") ||
    pathname.includes("/vendor/");

  let shouldShow = false;
  if (showOn === "all") {
    shouldShow = true;
  } else if (showOn === "landing") {
    shouldShow = isLanding;
  } else if (showOn === "dashboard") {
    shouldShow = isDashboard;
  }

  if (!shouldShow) return null;

  const isActive = (item: NavItem) => {
    return item.activePatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(pathname);
    });
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden bg-[oklch(0.92_0.03_75)] border-t-2 border-[oklch(0.7_0.05_55)] safe-px"
      style={{
        paddingBottom: `${safeArea.bottom}px`,
      }}
    >
      <div className="flex items-center justify-around h-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center h-full flex-1 gap-1 transition-all duration-200"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-[oklch(0.55_0.12_35)] shadow-md"
                    : "bg-transparent hover:bg-[oklch(0.85_0.04_65)]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active
                      ? "text-[oklch(0.98_0.01_75)]"
                      : "text-[oklch(0.45_0.05_45)]"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  active
                    ? "text-[oklch(0.55_0.12_35)]"
                    : "text-[oklch(0.45_0.05_45)]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
