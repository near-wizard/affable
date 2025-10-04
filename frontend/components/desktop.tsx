"use client"

import { useState } from "react"
import { DesktopIcon } from "./desktop-icon"
import { DesktopWindow } from "./desktop-window"
import { AboutContent } from "./window-content/about"
import { FeaturesContent } from "./window-content/features"
import { PricingContent } from "./window-content/pricing"
import { GetStartedContent } from "./window-content/get-started"
import { MenuBar } from "./menu-bar"

type WindowType = "about" | "features" | "pricing" | "get-started" | null

export function Desktop() {
  const [openWindow, setOpenWindow] = useState<WindowType>(null)

  const handleIconClick = (windowType: WindowType) => {
    setOpenWindow(windowType)
  }

  const handleCloseWindow = () => {
    setOpenWindow(null)
  }

  const handleMenuWindowOpen = (windowType: string) => {
    setOpenWindow(windowType as WindowType)
  }

  return (
    <div className="min-h-screen desktop-texture relative overflow-hidden flex flex-col">
      <MenuBar onWindowOpen={handleMenuWindowOpen} />

      <img
        src="/stained-glass-nature-scene-lower-right.jpg"
        alt=""
        className="absolute bottom-0 right-0 w-[55%] h-[60%] opacity-45 pointer-events-none"
        style={{
          maskImage: "linear-gradient(to top left, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top left, black 60%, transparent 100%)",
        }}
      />

      {/* Desktop Icons - Left Side */}
      <div className="absolute left-6 top-14 flex flex-col gap-8 z-10">
        <DesktopIcon icon="📄" label="About.txt" onClick={() => handleIconClick("about")} />
        <DesktopIcon icon="📁" label="Features" onClick={() => handleIconClick("features")} />
        <DesktopIcon icon="💰" label="Pricing" onClick={() => handleIconClick("pricing")} />
      </div>

      {/* Desktop Icons - Right Side */}
      <div className="absolute right-6 top-14 flex flex-col gap-8 z-10">
        <DesktopIcon icon="🚀" label="Get Started" onClick={() => handleIconClick("get-started")} />
        <DesktopIcon icon="🗑️" label="Trash" onClick={() => {}} disabled />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[oklch(0.48_0.10_30)] mb-4 drop-shadow-lg">Affable</h1>
          <p className="text-xl text-[oklch(0.40_0.06_45)]">Click an icon or menu to learn more</p>
        </div>
      </div>

      {openWindow === "about" && (
        <DesktopWindow title="About - Affable" onClose={handleCloseWindow}>
          <AboutContent />
        </DesktopWindow>
      )}

      {openWindow === "features" && (
        <DesktopWindow title="Features - Affable" onClose={handleCloseWindow}>
          <FeaturesContent />
        </DesktopWindow>
      )}

      {openWindow === "pricing" && (
        <DesktopWindow title="Pricing - Affable" onClose={handleCloseWindow}>
          <PricingContent />
        </DesktopWindow>
      )}

      {openWindow === "get-started" && (
        <DesktopWindow title="Get Started - Affable" onClose={handleCloseWindow}>
          <GetStartedContent />
        </DesktopWindow>
      )}
    </div>
  )
}
