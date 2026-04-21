// components/reports/PartnerCollectionSummary.jsx

import { formatCurrency } from '@/utils/formatters'

// partners — [{ id, name, collected, payment_count }]
// total    — total collected by all partners combined

export function PartnerCollectionSummary({ partners, total }) {
  if (!partners || partners.length === 0) return null

  return (
    <div className="space-y-2.5">
      {partners.map((p, i) => {
        const pct = total > 0 ? Math.round((p.collected / total) * 100) : 0

        return (
          <div key={p.id || i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {/* Partner initials */}
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center
                                justify-center text-[10px] font-bold text-white shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-primary">{p.name}</span>
                <span className="text-xs text-muted">
                  {p.payment_count} payment{p.payment_count !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(p.collected)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}