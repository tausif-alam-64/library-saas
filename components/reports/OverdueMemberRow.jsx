// components/reports/OverdueMemberRow.jsx

import Link from 'next/link'
import { ROUTES } from '@/utils/constants'
import { formatCurrency, formatShift } from '@/utils/formatters'

// member — { id, name, seat_number, shift, days_overdue, amount_due, fee_status }
// showAmount — boolean, show amount due (false on dashboard for brevity)
const AVATAR_COLORS = {
  A:'bg-violet-100 text-violet-700', B:'bg-blue-100 text-blue-700',
  C:'bg-cyan-100 text-cyan-700',     D:'bg-emerald-100 text-emerald-700',
  E:'bg-lime-100 text-lime-700',     F:'bg-amber-100 text-amber-700',
  G:'bg-orange-100 text-orange-700', H:'bg-rose-100 text-rose-700',
  I:'bg-pink-100 text-pink-700',     J:'bg-purple-100 text-purple-700',
  K:'bg-indigo-100 text-indigo-700', L:'bg-teal-100 text-teal-700',
  M:'bg-red-100 text-red-700',       N:'bg-sky-100 text-sky-700',
  O:'bg-green-100 text-green-700',   P:'bg-yellow-100 text-yellow-700',
  Q:'bg-fuchsia-100 text-fuchsia-700',R:'bg-emerald-100 text-emerald-700',
  S:'bg-purple-100 text-purple-700', T:'bg-teal-100 text-teal-700',
  U:'bg-blue-100 text-blue-700',     V:'bg-violet-100 text-violet-700',
  W:'bg-rose-100 text-rose-700',     X:'bg-orange-100 text-orange-700',
  Y:'bg-lime-100 text-lime-700',     Z:'bg-cyan-100 text-cyan-700',
}

function getAvatarColor(name) {
  const letter = (name || 'A').charAt(0).toUpperCase()
  return AVATAR_COLORS[letter] || 'bg-gray-100 text-gray-700'
}

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

  const initial = member.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(member.name)

  return (
    <Link
      href={ROUTES.MEMBER_PROFILE(member.id)}
      className="flex items-center gap-3 px-4 py-3.5
                 border-b border-gray-50 last:border-b-0
                 active:bg-gray-50 touch-manipulation no-underline"
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center
                      justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
        {initial}
      </div>

      {/* Name + seat */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {member.name}
        </p>
        {member.seat_number && (
          <p className="text-xs text-muted mt-0.5">
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
        <span className={`text-xs font-semibold px-2.5 py-1
                          rounded-full shrink-0 ${statusColor()}`}>
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