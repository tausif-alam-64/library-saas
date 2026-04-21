// app/(app)/reports/_components/ReportSummary.jsx

import { formatCurrency } from '@/utils/formatters'

// summary — {
//   total_members, fee_expected, fee_collected,
//   fee_pending, collection_rate
// }

export function ReportSummary({ summary }) {
  const rate = summary.collection_rate

  return (
    <div className="px-4 space-y-3">
      {/* Collection rate bar */}
      <div className="bg-surface rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Collection rate
          </p>
          <p className="text-lg font-bold text-primary">{rate}%</p>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${rate >= 90 ? 'bg-success' :
                rate >= 70 ? 'bg-warning' : 'bg-danger'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-muted">
            {formatCurrency(summary.fee_collected)} collected
          </p>
          <p className="text-xs text-muted">
            {formatCurrency(summary.fee_pending)} pending
          </p>
        </div>
      </div>

      {/* Three metric cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider
                        text-muted mb-1">Members</p>
          <p className="text-xl font-bold text-primary">
            {summary.total_members}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-green-100 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider
                        text-muted mb-1">Collected</p>
          <p className="text-base font-bold text-success">
            {formatCurrency(summary.fee_collected)}
          </p>
        </div>
        <div className={`bg-surface rounded-xl border p-3 text-center
          ${summary.fee_pending > 0 ? 'border-red-100' : 'border-gray-100'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider
                        text-muted mb-1">Pending</p>
          <p className={`text-base font-bold
            ${summary.fee_pending > 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(summary.fee_pending)}
          </p>
        </div>
      </div>
    </div>
  )
}