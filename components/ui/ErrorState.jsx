// components/ui/ErrorState.jsx
'use client'

// message — what went wrong in plain language
// onRetry — optional callback, shows retry button if provided
export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center
                      justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94
                   a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-gray-600
                     underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  )
}