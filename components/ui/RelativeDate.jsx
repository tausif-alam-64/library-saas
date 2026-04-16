// components/ui/RelativeDate.jsx

import { formatRelativeTime, formatDate } from '@/utils/formatters'

// Shows relative time for recent events ("2 hours ago", "Yesterday")
// Falls back to absolute date for older events
// title attribute shows full date on hover for desktop users

export function RelativeDate({ date, className = '' }) {
  if (!date) return <span className="text-gray-400">—</span>

  return (
    <time
      dateTime={date}
      title={formatDate(date)}
      className={className}
    >
      {formatRelativeTime(date)}
    </time>
  )
}