// components/ui/FeeStatusBadge.jsx

import { FEE_STATUS } from '@/utils/constants'

export function FeeStatusBadge({ status, daysOverdue = 0, daysLeft = 0 }) {
  if (status === FEE_STATUS.PAID) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full
                       text-xs font-medium bg-fee-paid-bg text-fee-paid-text">
        Paid
      </span>
    )
  }

  if (status === FEE_STATUS.GRACE) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full
                       text-xs font-medium bg-fee-grace-bg text-fee-grace-text">
        {daysLeft}d left
      </span>
    )
  }

  if (status === FEE_STATUS.OVERDUE) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full
                       text-xs font-medium bg-fee-overdue-bg text-fee-overdue-text">
        {daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Overdue'}
      </span>
    )
  }

  // New — shown for members who have never paid yet
  if (status === FEE_STATUS.UNPAID) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full
                       text-xs font-medium bg-gray-100 text-gray-500">
        Unpaid
      </span>
    )
  }

  return null
}