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