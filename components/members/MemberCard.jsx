// components/members/MemberCard.jsx

import Link from 'next/link'
import { FeeStatusBadge } from '@/components/ui/FeeStatusBadge'
import { ROUTES } from '@/utils/constants'
import { formatShift } from '@/utils/formatters'

// One row in the members list
// The entire card is a Link — tapping anywhere goes to the member profile
// Shows: name (prominent), seat + shift (secondary), fee status badge
// days_overdue and days_left passed through to FeeStatusBadge

export function MemberCard({ member }) {
  const { id, name, phone, current_allocation, fee_status, days_overdue, days_left, status } = member

  const isInactive = status === 'inactive'

  return (
    <Link
      href={ROUTES.MEMBER_PROFILE(id)}
      className="flex items-center gap-3 px-4 py-3.5 bg-white
                 border-b border-gray-100 active:bg-gray-50
                 touch-manipulation no-underline"
    >
      {/* Avatar — initials circle */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center
                       text-sm font-semibold shrink-0
                       ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white'}`}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate
                         ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
            {name}
          </p>
          {isInactive && (
            <span className="text-[10px] font-medium px-1.5 py-0.5
                             bg-gray-100 text-gray-400 rounded-full shrink-0">
              Inactive
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {current_allocation ? (
            <p className="text-xs text-gray-400 truncate">
              Seat {current_allocation.seat_number} · {formatShift(current_allocation.shift)}
            </p>
          ) : (
            <p className="text-xs text-gray-400">No seat assigned</p>
          )}
        </div>
      </div>

      {/* Fee status badge — right side */}
      {!isInactive && fee_status && (
        <div className="shrink-0">
          <FeeStatusBadge
            status={fee_status}
            daysOverdue={days_overdue}
            daysLeft={days_left}
          />
        </div>
      )}

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  )
}