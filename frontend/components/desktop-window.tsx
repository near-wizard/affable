"use client"

import { X, Minus, Square } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null

export function DesktopWindow({ 
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
  const [size, setSize] = useState(() => {
    // Responsive initial size based on viewport
    const vw = typeof window !== 'undefined' ? window.innerWidth : 700
    const vh = typeof window !== 'undefined' ? window.innerHeight : 500
    return {
      width: Math.min(800, vw * 0.9),
      height: Math.min(600, vh * 0.7)
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [preMaximizeState, setPreMaximizeState] = useState<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>(null)
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    posX: 0, 
    posY: 0 
  })
  const windowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        setPosition({
          x: clientX - dragStart.x,
          y: clientY - dragStart.y,
        })
      }
      if (isResizing && resizeDirection) {
        const deltaX = clientX - resizeStart.x
        const deltaY = clientY - resizeStart.y
        
        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = resizeStart.posX
        let newY = resizeStart.posY

        // Handle horizontal resizing
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(200, resizeStart.width + deltaX)
        } else if (resizeDirection.includes('w')) {
          const potentialWidth = resizeStart.width - deltaX
          if (potentialWidth >= 200) {
            newWidth = potentialWidth
            newX = resizeStart.posX + deltaX
          }
        }

        // Handle vertical resizing
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(200, resizeStart.height + deltaY)
        } else if (resizeDirection.includes('n')) {
          const potentialHeight = resizeStart.height - deltaY
          if (potentialHeight >= 200) {
            newHeight = potentialHeight
            newY = resizeStart.posY + deltaY
          }
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleEnd)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleEnd)
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleEnd)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleEnd)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection])

  const handleDragStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    const element = target as HTMLElement
    if (element?.closest('.window-controls') || element?.closest('button')) return
    setIsDragging(true)
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    })
    onFocus()
  }

  const handleMouseDragStart = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY, e.target)
  }

  const handleTouchDragStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target)
    }
  }

  const handleResizeStart = (clientX: number, clientY: number, direction: ResizeDirection) => {
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    })
    onFocus()
  }

  const handleMouseResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation()
    handleResizeStart(e.clientX, e.clientY, direction)
  }

  const handleTouchResizeStart = (e: React.TouchEvent, direction: ResizeDirection) => {
    e.stopPropagation()
    if (e.touches.length > 0) {
      handleResizeStart(e.touches[0].clientX, e.touches[0].clientY, direction)
    }
  }

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore previous size and position
      if (preMaximizeState) {
        setPosition(preMaximizeState.position)
        setSize(preMaximizeState.size)
      }
      setIsMaximized(false)
    } else {
      // Save current state and maximize
      setPreMaximizeState({ position, size })
      
      // Get viewport dimensions (accounting for menu bar)
      const menuBarHeight = 32 // 8 * 4 (h-8 class)
      const vw = window.innerWidth
      const vh = window.innerHeight
      
      setPosition({ x: 0, y: menuBarHeight })
      setSize({ 
        width: vw, 
        height: vh - menuBarHeight 
      })
      setIsMaximized(true)
    }
    onFocus()
  }

  const resizeHandleSize = 16 // Increased for better mobile touch targets

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
        touchAction: 'none',
      }}
      onClick={onFocus}
    >
      <div
        className="bg-[oklch(0.55_0.12_35)] text-[oklch(0.98_0.01_75)] px-3 py-2 flex items-center justify-between border-b-2 border-[oklch(0.45_0.06_45)] cursor-move select-none"
        onMouseDown={handleMouseDragStart}
        onTouchStart={handleTouchDragStart}
      >
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-2 window-controls">
          <button
            className="w-8 h-8 md:w-5 md:h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors touch-manipulation"
            onClick={(e) => e.stopPropagation()}
          >
            <Minus className="w-4 h-4 md:w-3 md:h-3 text-[oklch(0.30_0.04_45)]" />
          </button>
          <button
            className="w-8 h-8 md:w-5 md:h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors touch-manipulation"
            onClick={(e) => {
              e.stopPropagation()
              handleMaximize()
            }}
          >
            <Square className="w-4 h-4 md:w-3 md:h-3 text-[oklch(0.30_0.04_45)]" />
          </button>
          <button
            className="w-8 h-8 md:w-5 md:h-5 bg-[oklch(0.50_0.15_25)] hover:bg-[oklch(0.45_0.16_25)] border border-[oklch(0.40_0.12_25)] flex items-center justify-center transition-colors touch-manipulation"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <X className="w-4 h-4 md:w-3 md:h-3 text-[oklch(0.98_0.01_75)]" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="p-6 overflow-y-auto bg-[oklch(0.92_0.03_75)]" style={{ height: `calc(100% - 3rem)` }}>
        {children}
      </div>

      {/* Resize Handles - Edges */}
      {/* Top */}
      <div
        className="absolute top-0 left-0 right-0 cursor-n-resize hover:bg-blue-500/20 active:bg-blue-500/30"
        style={{ height: `${resizeHandleSize*.5}px` }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'n')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'n')}
      />
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 cursor-s-resize hover:bg-blue-500/20 active:bg-blue-500/30"
        style={{ height: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleMouseResizeStart(e, 's')}
        onTouchStart={(e) => handleTouchResizeStart(e, 's')}
      />
      {/* Left */}
      <div
        className="absolute top-0 left-0 bottom-0 cursor-w-resize hover:bg-blue-500/20 active:bg-blue-500/30"
        style={{ width: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'w')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'w')}
      />
      {/* Right */}
      <div
        className="absolute top-0 right-0 bottom-0 cursor-e-resize hover:bg-blue-500/20 active:bg-blue-500/30"
        style={{ width: `${resizeHandleSize * 0.3}px` }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'e')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'e')}
      />

      {/* Resize Handles - Corners */}
      {/* Top Left */}
      <div
        className="absolute top-0 left-0 cursor-nw-resize hover:bg-blue-500/30 active:bg-blue-500/40"
        style={{ 
          width: `${resizeHandleSize}px`, 
          height: `${resizeHandleSize}px` 
        }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'nw')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'nw')}
      />
      {/* Top Right */}
      <div
        className="absolute top-0 right-0 cursor-ne-resize hover:bg-blue-500/30 active:bg-blue-500/40"
        style={{ 
          width: `${resizeHandleSize}px`, 
          height: `${resizeHandleSize}px` 
        }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'ne')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'ne')}
      />
      {/* Bottom Left */}
      <div
        className="absolute bottom-0 left-0 cursor-sw-resize hover:bg-blue-500/30 active:bg-blue-500/40"
        style={{ 
          width: `${resizeHandleSize}px`, 
          height: `${resizeHandleSize}px` 
        }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'sw')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'sw')}
      />
      {/* Bottom Right */}
      <div
        className="absolute bottom-0 right-0 cursor-se-resize hover:bg-blue-500/30 active:bg-blue-500/40"
        style={{ 
          width: `${resizeHandleSize}px`, 
          height: `${resizeHandleSize}px`,
          background: 'linear-gradient(135deg, transparent 50%, oklch(0.45 0.06 45) 50%)',
        }}
        onMouseDown={(e) => handleMouseResizeStart(e, 'se')}
        onTouchStart={(e) => handleTouchResizeStart(e, 'se')}
      />
    </div>
  )
}