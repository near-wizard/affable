/**
 * Loading Skeleton Components
 * Reusable skeleton loaders for different data types
 */

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-6 bg-gray-100 rounded w-20" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded p-3">
              <div className="h-3 bg-gray-200 rounded mb-2" />
              <div className="h-5 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div className="h-10 bg-gray-100 rounded mt-4" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
      {/* Table header skeleton */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b border-gray-100 hover:bg-gray-50">
          {Array.from({ length: 8 }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 px-6 py-4">
              <div className="h-4 bg-gray-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ columns = 3, items = 6 }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatBoxSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-8 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200 animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded w-24" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="inline-block p-3 bg-red-100 rounded-full mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-6">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-block p-3 bg-gray-100 rounded-full mb-4">
        <svg
          className="h-8 w-8 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
