// app/(app)/payments/_components/PaymentsClient.jsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter }         from 'next/navigation'
import Link                  from 'next/link'
import { ROUTES }            from '@/utils/constants'
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  formatShift,
} from '@/utils/formatters'

// Groups payments by month for display
function groupByMonth(payments) {
  const groups = {}
  payments.forEach((p) => {
    // Group by the paid_on date's month
    const [y, m] = p.paid_on.split('-')
    const key    = `${y}-${m}`
    if (!groups[key]) groups[key] = { key, label: formatMonthYear(`${key}-01`), payments: [], total: 0 }
    groups[key].payments.push(p)
    groups[key].total += p.amount_paid
  })
  // Return sorted newest first
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
}

export function PaymentsClient({ initialPayments, totalCollected }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return initialPayments
    const q = search.toLowerCase().trim()
    return initialPayments.filter((p) =>
      p.member_name.toLowerCase().includes(q) ||
      p.collected_by_partner_name.toLowerCase().includes(q)
    )
  }, [initialPayments, search])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  return (
    <div className="pb-24">
      {/* Header summary */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">All time</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(totalCollected)}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {initialPayments.length} total payments
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
                          pointer-events-none" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder="Search by member or partner name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            className="w-full h-11 pl-9 pr-4 bg-white border border-gray-200
                       rounded-xl text-sm text-primary placeholder:text-gray-400
                       outline-none focus:border-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* No results */}
      {grouped.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted">
            {search ? 'No payments match your search' : 'No payments recorded yet'}
          </p>
        </div>
      )}

      {/* Grouped payment list */}
      {grouped.map((group) => (
        <div key={group.key} className="mb-4">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <p className="text-xs font-bold text-primary">
              {formatCurrency(Math.round(group.total))}
            </p>
          </div>

          {/* Payments in this month */}
          <div className="bg-surface mx-0 border-y border-gray-100">
            {group.payments.map((p) => (
              <Link
                key={p.id}
                href={p.member_id ? ROUTES.MEMBER_PROFILE(p.member_id) : '#'}
                className="flex items-start gap-3 px-4 py-3.5
                           border-b border-gray-50 last:border-b-0
                           active:bg-gray-50 touch-manipulation no-underline"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center
                                justify-center text-sm font-bold text-success shrink-0">
                  {p.member_name.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {p.member_name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(p.period_start_date)} — {formatDate(p.period_end_date)}
                    {p.is_prorated && (
                      <span className="ml-1.5 text-amber-600 font-medium">prorated</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {p.collected_by_partner_name} ·{' '}
                    {p.paid_on}
                  </p>
                  {p.notes && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 rounded
                                   px-1.5 py-0.5 mt-1 inline-block">
                      {p.notes}
                    </p>
                  )}
                </div>

                {/* Amount + mode */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-success">
                    {formatCurrency(p.amount_paid)}
                  </p>
                  <span className={`
                    text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase
                    ${p.payment_mode === 'cash'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                    }
                  `}>
                    {p.payment_mode}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}