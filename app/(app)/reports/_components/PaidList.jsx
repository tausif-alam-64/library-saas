// app/(app)/reports/_components/PaidList.jsx

import { formatCurrency, formatDate, formatShift } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'

// payments — every payment row overlapping this month
// (may have multiple entries for the same member if they paid twice)

export function PaidList({ payments }) {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Payments this month
        </h2>
        {payments.length > 0 && (
          <span className="text-xs font-bold text-success">
            {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState message="No payments recorded this month" />
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3
                         border-b border-gray-50 last:border-b-0"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center
                              justify-center text-xs font-bold text-success shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">
                  {p.name}
                </p>
                <p className="text-xs text-muted">
                  {p.seat_number
                    ? `Seat ${p.seat_number} · ${formatShift(p.shift)}`
                    : (p.shift ? formatShift(p.shift) : '')
                  }
                </p>
              </div>

              {/* Right */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-success">
                  {formatCurrency(p.amount_paid)}
                </p>
                <p className="text-[10px] text-muted">
                  {formatDate(p.paid_on)} · {p.collected_by_partner_name}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}