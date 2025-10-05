import { useState, useRef, useEffect } from "react"
import { X, Minus, Square, ArrowRight } from "lucide-react"
import { RFDContent } from "./window-content/rfd"

// Cookie utilities
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number) => {
  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`
}

// Desktop Icon Component
function DesktopIcon({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 p-2 rounded hover:bg-black/5 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="text-5xl group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-sm font-medium text-foreground bg-background/80 px-2 py-0.5 rounded shadow-sm">
        {label}
      </span>
    </button>
  )
}

// Menu Bar Component
function MenuBar({ onWindowOpen }: { onWindowOpen?: (windowType: string) => void }) {
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
  ]

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId)
  }

  const handleItemClick = (action: string | null) => {
    if (action && onWindowOpen) {
      onWindowOpen(action)
    }
    setActiveMenu(null)
  }

  return (
    <div ref={menuRef} className="h-8 border-b-2 border-[oklch(0.60_0.06_50)] flex items-center px-2 gap-1 shadow-[inset_0_1px_0_0_oklch(0.85_0.04_65)] bg-[oklch(0.72_0.05_55)] relative z-50">
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
                  onClick={() => handleItemClick(item.action)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 bg-[oklch(0.82_0.04_65)] border border-[oklch(0.60_0.06_50)] shadow-[inset_1px_1px_0_0_oklch(0.90_0.03_70)] text-[oklch(0.30_0.04_45)] rounded-sm">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  )
}

// Window Content Components
function AboutContent() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-2xl font-bold mb-4">About Affable</h2>
      <p className="mb-4">Affable is a comprehensive affiliate management solution built specifically for PostHog users. Track conversions, manage commissions, and scale your affiliate program with real-time analytics.</p>
      <h3 className="text-xl font-semibold mb-2">Key Benefits</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Seamless PostHog integration</li>
        <li>Real-time conversion tracking</li>
        <li>Automated commission processing</li>
        <li>Advanced fraud detection</li>
      </ul>
    </div>
  )
}

function FeaturesContent() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-2xl font-bold mb-4">Features</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Real-Time Tracking</h3>
          <p className="text-sm text-gray-600">Monitor affiliate performance with live conversion tracking and attribution modeling.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Commission Automation</h3>
          <p className="text-sm text-gray-600">Automatically calculate and process commissions based on your custom rules.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Fraud Detection</h3>
          <p className="text-sm text-gray-600">Advanced algorithms detect suspicious activity and protect your program.</p>
        </div>
      </div>
    </div>
  )
}

function PricingContent() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-2xl font-bold mb-4">Pricing</h2>
      <div className="space-y-6">
        <div className="border-2 border-gray-200 rounded p-4">
          <h3 className="text-xl font-bold">Starter</h3>
          <p className="text-3xl font-bold my-2">$99<span className="text-lg font-normal">/mo</span></p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Up to 50 affiliates</li>
            <li>Basic tracking</li>
            <li>Email support</li>
          </ul>
        </div>
        <div className="border-2 border-blue-500 rounded p-4 bg-blue-50">
          <h3 className="text-xl font-bold">Pro</h3>
          <p className="text-3xl font-bold my-2">$299<span className="text-lg font-normal">/mo</span></p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Unlimited affiliates</li>
            <li>Advanced analytics</li>
            <li>Priority support</li>
            <li>Fraud detection</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function GetStartedContent() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-2xl font-bold mb-4">Get Started</h2>
      <p className="mb-4">Ready to transform your affiliate marketing? Here's how to get started:</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li><strong>Sign up</strong> - Create your account in minutes</li>
        <li><strong>Connect PostHog</strong> - Integrate with your existing setup</li>
        <li><strong>Invite affiliates</strong> - Onboard your partners</li>
        <li><strong>Track & optimize</strong> - Monitor performance in real-time</li>
      </ol>
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm font-semibold">🚀 Get early access today!</p>
        <p className="text-sm mt-2">Join our waitlist for exclusive launch pricing.</p>
      </div>
    </div>
  )
}

// Cookie Banner Component
function CookieBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border-2 border-gray-800 shadow-lg p-4 z-[9999] rounded">
      <h3 className="font-bold mb-2">Cookie Notice</h3>
      <p className="text-sm text-gray-600 mb-4">
        We use cookies to remember your tutorial progress and improve your experience. By clicking "Accept", you consent to our use of cookies.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// Tutorial Lightbox Component
function TutorialLightbox({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const tutorials = [
    {
      title: "Welcome to Affable!",
      description: "Let's take a quick tour of the desktop interface. Click icons or use the menu bar to explore.",
      highlight: null,
    },
    {
      title: "Desktop Icons",
      description: "Click these icons on the left side to open different windows. Try clicking 'About.txt' to learn more about Affable.",
      highlight: "left-icons",
    },
    {
      title: "Multiple Windows",
      description: "You can open multiple windows at once! Each window can be dragged, resized, and managed independently.",
      highlight: null,
    },
    {
      title: "Menu Bar",
      description: "Use the menu bar at the top to quickly access features, pricing, and get started options.",
      highlight: "menu-bar",
    },
    {
      title: "You're All Set!",
      description: "Start exploring Affable and discover how we can help scale your affiliate program with PostHog.",
      highlight: null,
    },
  ]

  const current = tutorials[step]

  return (
    <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Step {step + 1} of {tutorials.length}</span>
            <button onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-700">
              Skip tutorial
            </button>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((step + 1) / tutorials.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
        <p className="text-gray-600 mb-6">{current.description}</p>

        <div className="flex gap-3">
          {step < tutorials.length - 1 ? (
            <button
              onClick={onNext}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSkip}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Draggable/Resizable Window Component
function DesktopWindow({ 
  id, 
  title, 
  children, 
  onClose, 
  onFocus, 
  zIndex,
  initialPosition,
}: { 
  id: string
  title: string
  children: React.ReactNode
  onClose: () => void
  onFocus: () => void
  zIndex: number
  initialPosition: { x: number; y: number }
}) {
  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState({ width: 700, height: 500 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }
      if (isResizing) {
        const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x))
        const newHeight = Math.max(300, resizeStart.height + (e.clientY - resizeStart.y))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  const handleDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.window-controls') || target.closest('button')) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    onFocus()
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
    onFocus()
  }

  return (
    <div
      ref={windowRef}
      className="absolute bg-[oklch(0.92_0.03_75)] border-4 border-[oklch(0.45_0.06_45)] shadow-[8px_8px_0_0_oklch(0.35_0.05_40)]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
      }}
      onClick={onFocus}
    >
      <div
        className="bg-[oklch(0.55_0.12_35)] text-[oklch(0.98_0.01_75)] px-3 py-2 flex items-center justify-between border-b-2 border-[oklch(0.45_0.06_45)] cursor-move"
        onMouseDown={handleDragStart}
      >
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-2 window-controls">
          <button 
            className="w-5 h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Minus className="w-3 h-3 text-[oklch(0.30_0.04_45)]" />
          </button>
          <button 
            className="w-5 h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Square className="w-3 h-3 text-[oklch(0.30_0.04_45)]" />
          </button>
          <button
            className="w-5 h-5 bg-[oklch(0.50_0.15_25)] hover:bg-[oklch(0.45_0.16_25)] border border-[oklch(0.40_0.12_25)] flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <X className="w-3 h-3 text-[oklch(0.98_0.01_75)]" />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto bg-[oklch(0.92_0.03_75)]" style={{ height: `calc(100% - 3rem)` }}>
        {children}
      </div>

      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, oklch(0.45 0.06 45) 50%)',
        }}
      />
    </div>
  )
}

// Main Desktop Component
export default function Desktop() {
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

  const getWindowContent = (type: string, subRoute?: string) => {
    switch (type) {
      case "about": return <AboutContent />
      case "features": return <FeaturesContent />
      case "pricing": return <PricingContent />
      case "get-started": return <GetStartedContent />
      case "rfd": return (
        <RFDContent 
          initialNumber={subRoute ? parseInt(subRoute) : undefined}
          onNavigate={(number) => {
            const url = number ? `/rfd/${number}` : '/rfd'
            window.history.replaceState({}, '', url)
          }}
        />
      )
      default: return <div>Content not found</div>
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #a8d5e2 0%, #f5e6d3 100%)' }}>
      <MenuBar onWindowOpen={openWindow} />

      <img
        src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop"
        alt=""
        className="absolute bottom-0 right-0 w-[55%] h-[60%] opacity-30 pointer-events-none object-cover"
        style={{
          maskImage: "linear-gradient(to top left, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top left, black 60%, transparent 100%)",
        }}
      />

      <div className="absolute left-6 top-14 flex flex-col gap-8 z-10">
        <DesktopIcon icon="📄" label="About.txt" onClick={() => openWindow("about")} />
        <DesktopIcon icon="📊" label="Features" onClick={() => openWindow("features")} />
        <DesktopIcon icon="💰" label="Pricing" onClick={() => openWindow("pricing")} />
      </div>

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