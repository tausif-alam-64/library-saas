// app/(app)/reports/_components/MonthSelectorClient.jsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// month — 1-12
// year  — full year e.g. 2026

export function MonthSelectorClient({ month, year }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function navigate(newMonth, newYear) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', String(newMonth))
    params.set('year',  String(newYear))
    router.push(`${pathname}?${params.toString()}`)
  }

  function goBack() {
    let m = month - 1
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    navigate(m, y)
  }

  function goForward() {
    const now = new Date()
    // Cannot go beyond current month
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    let m = month + 1
    let y = year
    if (m > 12) { m = 1; y += 1 }
    navigate(m, y)
  }

  const now            = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year:  'numeric',
  })

  return (
    <div className="flex items-center gap-3">
      {/* Back arrow */}
      <button
        onClick={goBack}
        aria-label="Previous month"
        className="w-9 h-9 flex items-center justify-center rounded-xl
                   bg-surface border border-gray-200
                   active:bg-gray-50 touch-manipulation"
      >
        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Month label */}
      <div className="flex-1 text-center">
        <p className="text-sm font-bold text-primary">{monthName}</p>
        {isCurrentMonth && (
          <p className="text-[10px] text-success font-medium">This month</p>
        )}
      </div>

      {/* Forward arrow — disabled on current month */}
      <button
        onClick={goForward}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className={`w-9 h-9 flex items-center justify-center rounded-xl border
                    ${isCurrentMonth
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                      : 'border-gray-200 bg-surface text-gray-600 active:bg-gray-50 touch-manipulation'
                    }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}