// components/ui/FeeStatusBadge.jsx

import { FEE_STATUS } from '@/utils/constants'

// status — 'paid' | 'grace' | 'overdue'
// daysOverdue — number (only shown when overdue)
// daysLeft — number (only shown when in grace period)
export function FeeStatusBadge({ status, daysOverdue = 0, daysLeft = 0 }) {
  if (status === FEE_STATUS.PAID) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full
                       text-xs font-medium bg-green-100 text-green-800">
        Paid
      </span>
    )
  }

  if (status === FEE_STATUS.GRACE) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full
                       text-xs font-medium bg-amber-100 text-amber-800">
        {daysLeft}d left
      </span>
    )
  }

  if (status === FEE_STATUS.OVERDUE) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full
                       text-xs font-medium bg-red-100 text-red-800">
        {daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Overdue'}
      </span>
    )
  }

  return null
}