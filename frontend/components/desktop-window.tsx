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
  const [size, setSize] = useState({ width: 700, height: 500 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
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
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }
      if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y
        
        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = resizeStart.posX
        let newY = resizeStart.posY

        // Handle horizontal resizing
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(400, resizeStart.width + deltaX)
        } else if (resizeDirection.includes('w')) {
          const potentialWidth = resizeStart.width - deltaX
          if (potentialWidth >= 400) {
            newWidth = potentialWidth
            newX = resizeStart.posX + deltaX
          }
        }

        // Handle vertical resizing
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(300, resizeStart.height + deltaY)
        } else if (resizeDirection.includes('n')) {
          const potentialHeight = resizeStart.height - deltaY
          if (potentialHeight >= 300) {
            newHeight = potentialHeight
            newY = resizeStart.posY + deltaY
          }
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection])

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

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    })
    onFocus()
  }

  const resizeHandleSize = 8 // Size of resize handles in pixels

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

      {/* Window Content */}
      <div className="p-6 overflow-y-auto bg-[oklch(0.92_0.03_75)]" style={{ height: `calc(100% - 3rem)` }}>
        {children}
      </div>

      {/* Resize Handles - Edges */}
      {/* Top */}
      <div
        className="absolute top-0 left-0 right-0 cursor-n-resize hover:bg-blue-500/20"
        style={{ height: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 cursor-s-resize hover:bg-blue-500/20"
        style={{ height: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      {/* Left */}
      <div
        className="absolute top-0 left-0 bottom-0 cursor-w-resize hover:bg-blue-500/20"
        style={{ width: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      {/* Right */}
      <div
        className="absolute top-0 right-0 bottom-0 cursor-e-resize hover:bg-blue-500/20"
        style={{ width: `${resizeHandleSize}px` }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />

      {/* Resize Handles - Corners */}
      {/* Top Left */}
      <div
        className="absolute top-0 left-0 cursor-nw-resize hover:bg-blue-500/30"
        style={{ 
          width: `${resizeHandleSize * 2}px`, 
          height: `${resizeHandleSize * 2}px` 
        }}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
      />
      {/* Top Right */}
      <div
        className="absolute top-0 right-0 cursor-ne-resize hover:bg-blue-500/30"
        style={{ 
          width: `${resizeHandleSize * 2}px`, 
          height: `${resizeHandleSize * 2}px` 
        }}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
      />
      {/* Bottom Left */}
      <div
        className="absolute bottom-0 left-0 cursor-sw-resize hover:bg-blue-500/30"
        style={{ 
          width: `${resizeHandleSize * 2}px`, 
          height: `${resizeHandleSize * 2}px` 
        }}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
      />
      {/* Bottom Right */}
      <div
        className="absolute bottom-0 right-0 cursor-se-resize hover:bg-blue-500/30"
        style={{ 
          width: `${resizeHandleSize * 2}px`, 
          height: `${resizeHandleSize * 2}px`,
          background: 'linear-gradient(135deg, transparent 50%, oklch(0.45 0.06 45) 50%)',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />
    </div>
  )
}