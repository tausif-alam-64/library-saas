// app/(app)/dashboard/_components/StatCards.jsx

import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/utils/formatters'

// stats — pre-computed object from dashboard/page.jsx
// {
//   total_active:     number,
//   seats_occupied:   number,
//   seats_total:      number,
//   collected_month:  number,
//   unpaid_count:     number,
// }

export function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {/* Active members */}
      <StatCard
        label="Active members"
        value={stats.total_active}
        sub={`${stats.seats_total} seats total`}
      />

      {/* Seats occupied */}
      <StatCard
        label="Seats occupied"
        value={`${stats.seats_occupied}/${stats.seats_total}`}
        sub={`${stats.seats_total - stats.seats_occupied} free`}
        accent={stats.seats_occupied === stats.seats_total ? 'warning' : 'default'}
      />

      {/* Fee collected this month */}
      <StatCard
        label="Collected this month"
        value={formatCurrency(stats.collected_month)}
        accent="success"
      />

      {/* Unpaid this month */}
      <StatCard
        label="Unpaid this month"
        value={stats.unpaid_count}
        sub={stats.unpaid_count > 0 ? 'need collection' : 'all up to date'}
        accent={stats.unpaid_count > 0 ? 'danger' : 'success'}
      />
    </div>
  )
}