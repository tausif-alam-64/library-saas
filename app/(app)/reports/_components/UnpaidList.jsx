// app/(app)/reports/_components/UnpaidList.jsx

import { OverdueMemberRow } from '@/components/reports/OverdueMemberRow'
import { EmptyState } from '@/components/ui/EmptyState'

// members — [{ id, name, seat_number, shift, days_overdue,
//              fee_status, days_left, amount_due }]

export function UnpaidList({ members }) {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium text-muted">
          Unpaid this month
        </h2>
        {members.length > 0 && (
          <span className="text-xs font-bold text-danger">
            {members.length} members
          </span>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <EmptyState
            message="All members paid this month"
            success
          />
        ) : (
          members.map((m) => (
            <OverdueMemberRow
              key={m.id}
              member={m}
              showAmount
            />
          ))
        )}
      </div>
    </div>
  )
}