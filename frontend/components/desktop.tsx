"use client"

import { useEffect, useState, useRef } from "react"
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
import { useRouter } from "next/navigation"
import { RFDContent } from "./window-content/rfd"

export function Desktop({ 
  initialSlug, 
  initialSubSlug 
}: { 
  initialSlug?: string | null
  initialSubSlug?: string | null 
}) {
  const [windows, setWindows] = useState<Array<{ id: string; type: string; title: string; zIndex: number; position: { x: number; y: number }, subRoute?: string  }>>([])
  const [nextZIndex, setNextZIndex] = useState(1000)
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const router = useRouter()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!initialSlug) return
    
    const valid = ["about", "features", "pricing", "get-started", "rfd"]
    if (valid.includes(initialSlug)) {
      hasInitialized.current = true
      openWindow(initialSlug, initialSubSlug || undefined)
    }
  }, []) // Empty dependency array - only run once on mount

  // Update document title when windows change (for better UX, not SEO)
  useEffect(() => {
    if (windows.length === 0) {
      document.title = "Affable - Your Desktop Experience"
      return
    }
    
    // Find the top-most window
    const topWindow = windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b))
    document.title = topWindow.title
  }, [windows])

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

  const openWindow = (type: string, subRoute?: string) => {
    const existingWindow = windows.find(w => w.type === type)
    if (existingWindow) {
      focusWindow(existingWindow.id, subRoute)
      return
    }

    const titles: { [key: string]: string } = {
      about: "About - Affable",
      features: "Features - Affable",
      pricing: "Pricing - Affable",
      "get-started": "Get Started - Affable",
      rfd: "RFDs - Affable"
    }

    // Calculate position based on viewport size and existing windows
    const isMobile = window.innerWidth < 768
    const baseOffset = isMobile ? 10 : 30
    const offset = windows.length * baseOffset
    
    // Center the window on mobile, cascade on desktop
    const x = isMobile 
      ? Math.max(10, (window.innerWidth - 700) / 2)
      : 100 + offset
    const y = isMobile 
      ? Math.max(50, (window.innerHeight - 500) / 2)
      : 100 + offset

    const newWindow = {
      id: `${type}-${Date.now()}`,
      type,
      title: titles[type] || "Window",
      zIndex: nextZIndex,
      position: { x, y },
    }

    setWindows(prev => [...prev, newWindow])
    setNextZIndex(prev => prev + 1)
    
    // Update URL immediately without navigation
    const url = subRoute ? `/${type}/${subRoute}` : `/${type}`
    window.history.replaceState({}, '', url)
  }

  const closeWindow = (id: string) => {
    setWindows(prev => {
      const remaining = prev.filter(w => w.id !== id)
  
      if (remaining.length > 0) {
        // find window with highest zIndex (top-most)
        const top = remaining.reduce((a, b) => (a.zIndex > b.zIndex ? a : b))
        const url = top.subRoute ? `/${top.type}/${top.subRoute}` : `/${top.type}`
        window.history.replaceState({}, '', url)
      } else {
        // if no windows remain, reset URL to root
        window.history.replaceState({}, '', '/')
      }
  
      return remaining
    })
  }

  const focusWindow = (id: string, newSubRoute?: string) => {
    setWindows(prev => {
      const updated = prev.map(w =>
        w.id === id 
          ? { ...w, zIndex: nextZIndex, subRoute: newSubRoute ?? w.subRoute } 
          : w
      )
      const focused = updated.find(w => w.id === id)
      if (focused) {
        const url = focused.subRoute ? `/${focused.type}/${focused.subRoute}` : `/${focused.type}`
        window.history.replaceState({}, '', url)
      }
      
      return updated
    })
    setNextZIndex(prev => prev + 1)
  }

  const getWindowContent = (window: { type: string; subRoute?: string }) => {
    switch (window.type) {
      case "about": return <AboutContent />
      case "features": return <FeaturesContent />
      case "pricing": return <PricingContent />
      case "get-started": return <GetStartedContent />
      case "rfd": return (
        <RFDContent 
          initialNumber={window.subRoute ? parseInt(window.subRoute) : undefined}
          onNavigate={(number) => {
            // Update the current window's subRoute
            const currentWindow = windows.find(w => w.type === 'rfd')
            if (currentWindow) {
              focusWindow(currentWindow.id, number?.toString())
            }
          }}
        />
      )
      default: return <div>Content not found</div>
    }
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

      {/* Desktop Icons - Left Side - Hidden on small mobile */}
      <div className="hidden sm:flex absolute left-6 top-14 flex-col gap-8 z-10">
        <DesktopIcon icon="📄" label="About.txt" onClick={() => openWindow("about")} />
        <DesktopIcon icon="📊" label="Features" onClick={() => openWindow("features")} />
        <DesktopIcon icon="💰" label="Pricing" onClick={() => openWindow("pricing")} />
      </div>

      {/* Desktop Icons - Right Side - Hidden on small mobile */}
      <div className="hidden sm:flex absolute right-6 top-14 flex-col gap-8 z-10">
        <DesktopIcon icon="🚀" label="Get Started" onClick={() => openWindow("get-started")} />
        <DesktopIcon icon="📋" label="RFDs" onClick={() => openWindow("rfd")} />
        <DesktopIcon icon="🗑️" label="Trash" onClick={() => {}} disabled />
      </div>

      {/* Mobile Icon Grid - Shown only on small screens */}
      <div className="sm:hidden absolute inset-x-4 top-14 grid grid-cols-3 gap-4 z-10">
        <DesktopIcon icon="📄" label="About" onClick={() => openWindow("about")} />
        <DesktopIcon icon="📊" label="Features" onClick={() => openWindow("features")} />
        <DesktopIcon icon="💰" label="Pricing" onClick={() => openWindow("pricing")} />
        <DesktopIcon icon="🚀" label="Start" onClick={() => openWindow("get-started")} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center px-4">
          <h1 className="text-4xl sm:text-6xl font-bold text-[oklch(0.48_0.10_30)] mb-4 drop-shadow-lg">Affable</h1>
          <p className="text-lg sm:text-xl text-[oklch(0.40_0.06_45)]">Click an icon or menu to learn more</p>
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
          {getWindowContent(window)}
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