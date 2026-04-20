// app/(app)/dashboard/_components/ExpiringList.jsx

import Link from 'next/link'
import { ROUTES } from '@/utils/constants'
import { formatDate, formatShift } from '@/utils/formatters'

// members — [{ id, name, seat_number, shift, expiry_date }]
//           sorted by expiry_date ascending (soonest first)

export function ExpiringList({ members }) {
  if (members.length === 0) return null

  return (
    <div className="mx-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider
                     text-muted mb-2">
        Expiring this week
      </h2>

      <div className="bg-surface rounded-2xl border border-amber-100 overflow-hidden">
        {members.map((m) => {
          const expiry    = new Date(m.expiry_date)
          const today     = new Date()
          today.setHours(0, 0, 0, 0)
          expiry.setHours(0, 0, 0, 0)
          const daysLeft  = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
          const isToday   = daysLeft === 0
          const isTomorrow = daysLeft === 1

          return (
            <Link
              key={m.id}
              href={ROUTES.MEMBER_PROFILE(m.id)}
              className="flex items-center gap-3 px-4 py-3
                         border-b border-amber-50 last:border-b-0
                         active:bg-amber-50 touch-manipulation no-underline"
            >
              {/* Days indicator */}
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center
                               justify-center shrink-0 text-center
                               ${isToday ? 'bg-danger text-white' :
                                 isTomorrow ? 'bg-warning text-white' :
                                 'bg-amber-100 text-amber-800'}`}>
                <span className="text-[10px] font-medium leading-none">
                  {isToday ? 'Today' : isTomorrow ? 'Tmrw' : `${daysLeft}d`}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">
                  {m.name}
                </p>
                <p className="text-xs text-muted">
                  Seat {m.seat_number} · {formatShift(m.shift)}
                </p>
              </div>

              {/* Expiry date */}
              <div className="text-right shrink-0">
                <p className="text-xs text-muted">expires</p>
                <p className="text-xs font-medium text-primary">
                  {formatDate(m.expiry_date)}
                </p>
              </div>

              <svg className="w-4 h-4 text-gray-300 shrink-0"
                viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}