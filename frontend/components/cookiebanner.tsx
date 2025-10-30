export function CookieBanner({ onAccept }: { onAccept: () => void }) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border-2 border-gray-800 shadow-lg p-4 z-[9999] rounded">
        <h3 className="font-bold mb-2">Cookie Notice</h3>
        <p className="text-sm text-muted-foreground mb-4">
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
            className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    )
  }