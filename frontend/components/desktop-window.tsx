"use client"

import { X, Minus, Square } from "lucide-react"
import type { ReactNode } from "react"

interface DesktopWindowProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function DesktopWindow({ title, onClose, children }: DesktopWindowProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 bg-[oklch(0.40_0.05_40)]/30 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[80vh] bg-[oklch(0.92_0.03_75)] border-4 border-[oklch(0.45_0.06_45)] shadow-[8px_8px_0_0_oklch(0.35_0.05_40)] animate-in zoom-in-95 duration-200">
        <div className="bg-[oklch(0.55_0.12_35)] text-[oklch(0.98_0.01_75)] px-3 py-2 flex items-center justify-between border-b-2 border-[oklch(0.45_0.06_45)]">
          <span className="font-semibold text-sm">{title}</span>
          <div className="flex items-center gap-2">
            <button
              className="w-5 h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors"
              onClick={() => {}}
            >
              <Minus className="w-3 h-3 text-[oklch(0.30_0.04_45)]" />
            </button>
            <button
              className="w-5 h-5 bg-[oklch(0.80_0.04_60)] hover:bg-[oklch(0.75_0.05_55)] border border-[oklch(0.60_0.06_50)] flex items-center justify-center transition-colors"
              onClick={() => {}}
            >
              <Square className="w-3 h-3 text-[oklch(0.30_0.04_45)]" />
            </button>
            <button
              className="w-5 h-5 bg-[oklch(0.50_0.15_25)] hover:bg-[oklch(0.45_0.16_25)] border border-[oklch(0.40_0.12_25)] flex items-center justify-center transition-colors"
              onClick={onClose}
            >
              <X className="w-3 h-3 text-[oklch(0.98_0.01_75)]" />
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-3rem)] bg-[oklch(0.92_0.03_75)]">{children}</div>
      </div>
    </div>
  )
}
