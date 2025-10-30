import { ArrowRight } from "lucide-react";

// Tutorial Lightbox Component
export function TutorialLightbox({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
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
            <span className="text-sm text-muted-foreground">Step {step + 1} of {tutorials.length}</span>
            <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
              Skip tutorial
            </button>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((step + 1) / tutorials.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
        <p className="text-muted-foreground mb-6">{current.description}</p>

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