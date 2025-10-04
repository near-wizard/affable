"use client"

import { useEffect, useState } from "react"
import { DesktopIcon } from "./desktop-icon"
import { DesktopWindow } from "./desktop-window"
import { AboutContent } from "./window-content/about"
import { FeaturesContent } from "./window-content/features"
import { PricingContent } from "./window-content/pricing"
import { GetStartedContent } from "./window-content/get-started"
import { MenuBar } from "./menu-bar"
import { WindowType } from "@/types/window"
import { getCookie, setCookie } from "@/utils/cookies"
import { CookieBanner } from "./cookiebanner"
import { TutorialLightbox } from "./tutorial-lightbox"

export function Desktop() {
  const [windows, setWindows] = useState<Array<{ id: string; type: string; title: string; zIndex: number; position: { x: number; y: number } }>>([])
  const [nextZIndex, setNextZIndex] = useState(1000)
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  useEffect(() => {
    const hasSeenTutorial = getCookie('affable_tutorial_completed')
    const hasAcceptedCookies = getCookie('affable_cookies_accepted')
    
    if (!hasAcceptedCookies) {
      setShowCookieBanner(true)
    } else if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }, [])

  const handleAcceptCookies = () => {
    setCookie('affable_cookies_accepted', 'true', 365)
    setShowCookieBanner(false)
    
    const hasSeenTutorial = getCookie('affable_tutorial_completed')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }

  const handleTutorialNext = () => {
    setTutorialStep(prev => prev + 1)
  }

  const handleTutorialSkip = () => {
    setCookie('affable_tutorial_completed', 'true', 365)
    setShowTutorial(false)
    setTutorialStep(0)
  }

  const openWindow = (type: string) => {
    const existingWindow = windows.find(w => w.type === type)
    if (existingWindow) {
      focusWindow(existingWindow.id)
      return
    }

    const titles: { [key: string]: string } = {
      about: "About - Affable",
      features: "Features - Affable",
      pricing: "Pricing - Affable",
      "get-started": "Get Started - Affable",
    }

    const offset = windows.length * 30
    const newWindow = {
      id: `${type}-${Date.now()}`,
      type,
      title: titles[type] || "Window",
      zIndex: nextZIndex,
      position: { x: 100 + offset, y: 100 + offset },
    }

    setWindows([...windows, newWindow])
    setNextZIndex(nextZIndex + 1)
  }

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id))
  }

  const focusWindow = (id: string) => {
    setWindows(windows.map(w => 
      w.id === id ? { ...w, zIndex: nextZIndex } : w
    ))
    setNextZIndex(nextZIndex + 1)
  }

  const getWindowContent = (type: string) => {
    switch (type) {
      case "about": return <AboutContent />
      case "features": return <FeaturesContent />
      case "pricing": return <PricingContent />
      case "get-started": return <GetStartedContent />
      default: return <div>Content not found</div>
    }
  }

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
      <MenuBar onWindowOpen={openWindow} />

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
        <DesktopIcon icon="📄" label="About.txt" onClick={() => openWindow("about")} />
        <DesktopIcon icon="📁" label="Features" onClick={() => openWindow("features")} />
        <DesktopIcon icon="💰" label="Pricing" onClick={() => openWindow("pricing")} />
      </div>

      {/* Desktop Icons - Right Side */}
      <div className="absolute right-6 top-14 flex flex-col gap-8 z-10">
        <DesktopIcon icon="🚀" label="Get Started" onClick={() => openWindow("get-started")} />
        <DesktopIcon icon="🗑️" label="Trash" onClick={() => {}} disabled />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[oklch(0.48_0.10_30)] mb-4 drop-shadow-lg">Affable</h1>
          <p className="text-xl text-[oklch(0.40_0.06_45)]">Click an icon or menu to learn more</p>
        </div>
      </div>
      {windows.map((window) => (
        <DesktopWindow
          key={window.id}
          id={window.id}
          title={window.title}
          onClose={() => closeWindow(window.id)}
          onFocus={() => focusWindow(window.id)}
          zIndex={window.zIndex}
          initialPosition={window.position}
        >
          {getWindowContent(window.type)}
        </DesktopWindow>
      ))}

      {showCookieBanner && <CookieBanner onAccept={handleAcceptCookies} />}
      {showTutorial && (
        <TutorialLightbox
          step={tutorialStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
        />
      )}
    </div>
  )
}