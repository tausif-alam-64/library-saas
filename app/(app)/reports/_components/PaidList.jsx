// app/(app)/reports/_components/PaidList.jsx

import { formatCurrency, formatDate, formatShift } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'

// members — [{ id, name, seat_number, shift, amount_paid,
//              paid_on, collected_by_partner_name, payment_mode }]

export function PaidList({ members }) {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Paid this month
        </h2>
        <span className="text-xs font-bold text-success">
          {members.length} members
        </span>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <EmptyState message="No payments recorded this month" />
        ) : (
          members.map((m, i) => (
            <div
              key={m.id + '-' + i}
              className="flex items-center gap-3 px-4 py-3
                         border-b border-gray-50 last:border-b-0"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center
                              justify-center text-xs font-bold text-success shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{m.name}</p>
                <p className="text-xs text-muted">
                  {m.seat_number
                    ? `Seat ${m.seat_number} · ${formatShift(m.shift)}`
                    : formatShift(m.shift)
                  }
                </p>
              </div>

              {/* Right */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-success">
                  {formatCurrency(m.amount_paid)}
                </p>
                <p className="text-[10px] text-muted">
                  {formatDate(m.paid_on)}
                  {m.collected_by_partner_name
                    ? ` · ${m.collected_by_partner_name}`
                    : ''
                  }
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}