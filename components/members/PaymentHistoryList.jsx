// components/members/PaymentHistoryList.jsx

// Renders all fee payment records for one member
// Most recent payment at top
// Shows: period covered, amount, date paid, who collected, mode (cash/upi)
// The "collected by" column directly solves the 3-partner trust problem —
// any partner can see who collected any payment

import { formatCurrency, formatDate, formatMonthYear } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'

export function PaymentHistoryList({ payments = [] }) {
  if (payments.length === 0) {
    return (
      <EmptyState
        message="No payments recorded yet"
        description="Payments will appear here once recorded"
      />
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {payments.map((payment) => (
        <div key={payment.id} className="py-3.5 flex items-start gap-3">
          {/* Month indicator */}
          <div className="w-11 h-11 rounded-lg bg-green-50 flex flex-col
                          items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-green-700 leading-none uppercase">
              {new Date(payment.period_start_date).toLocaleString('en-IN', { month: 'short' })}
            </span>
            <span className="text-xs font-bold text-green-800 leading-none mt-0.5">
              {new Date(payment.period_start_date).getFullYear().toString().slice(2)}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(payment.amount_paid)}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase
                                ${payment.payment_mode === 'cash'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700'
                                }`}>
                {payment.payment_mode}
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-0.5">
              Paid on {formatDate(payment.paid_on)}
              {payment.is_prorated && (
                <span className="ml-1.5 text-gray-400">({payment.days_covered} days)</span>
              )}
            </p>

            <p className="text-xs text-gray-400 mt-0.5">
              Collected by {payment.collected_by_partner_name || 'Unknown'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}