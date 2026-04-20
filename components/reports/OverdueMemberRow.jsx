// components/reports/OverdueMemberRow.jsx

import Link from 'next/link'
import { ROUTES } from '@/utils/constants'
import { formatCurrency, formatShift } from '@/utils/formatters'

// member — { id, name, seat_number, shift, days_overdue, amount_due, fee_status }
// showAmount — boolean, show amount due (false on dashboard for brevity)

export function OverdueMemberRow({ member, showAmount = true }) {
  const isOverdue = member.fee_status === 'overdue'
  const isGrace   = member.fee_status === 'grace'
  const isUnpaid  = member.fee_status === 'unpaid'

  function statusLabel() {
    if (isOverdue) return `${member.days_overdue}d overdue`
    if (isGrace)   return `${member.days_left}d left`
    if (isUnpaid)  return 'Never paid'
    return ''
  }

  function statusColor() {
    if (isOverdue) return 'text-danger bg-red-50'
    if (isGrace)   return 'text-warning bg-amber-50'
    if (isUnpaid)  return 'text-muted bg-gray-100'
    return ''
  }

  return (
    <Link
      href={ROUTES.MEMBER_PROFILE(member.id)}
      className="flex items-center gap-3 px-4 py-3
                 border-b border-gray-50 last:border-b-0
                 active:bg-gray-50 touch-manipulation no-underline"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center
                      justify-center text-xs font-bold text-muted shrink-0">
        {member.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + seat */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {member.name}
        </p>
        {member.seat_number && (
          <p className="text-xs text-muted">
            Seat {member.seat_number} · {formatShift(member.shift)}
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {showAmount && member.amount_due && (
          <p className="text-sm font-bold text-primary">
            {formatCurrency(member.amount_due)}
          </p>
        )}
        <span className={`text-[10px] font-semibold px-1.5 py-0.5
                          rounded-full ${statusColor()}`}>
          {statusLabel()}
        </span>
      </div>

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-300 shrink-0"
        viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </Link>
  )
}