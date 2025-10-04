"use client"

interface DesktopIconProps {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
}

export function DesktopIcon({ icon, label, onClick, disabled }: DesktopIconProps) {
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