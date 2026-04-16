// components/members/MemberSearchBar.jsx
'use client'

// Controlled search input
// Fires onChange on every keystroke — no debounce
// Client-side filtering of ~100 members is instant — no debounce needed
// Clear button appears when there is text

export function MemberSearchBar({ value, onChange }) {
  return (
    <div className="relative">
      {/* Search icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round"/>
        </svg>
      </div>

      {/* Input */}
      <input
        type="search"
        inputMode="text"
        placeholder="Search by name or phone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        className="w-full h-11 pl-9 pr-9 bg-white border border-gray-200
                   rounded-xl text-sm text-gray-900 placeholder:text-gray-400
                   outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200
                   transition-colors"
      />

      {/* Clear button */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2
                     w-7 h-7 flex items-center justify-center
                     text-gray-400 hover:text-gray-600
                     touch-manipulation"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}