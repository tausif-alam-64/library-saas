// components/members/AllocationHistoryList.jsx

// Shows every seat this member has ever been assigned
// Current allocation shown with "Active" badge
// Answering "which seat was this person on in January?" — a common dispute scenario
// Soft delete means this history is never lost

import { formatDate, formatShift } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'

export function AllocationHistoryList({ allocations = [] }) {
  if (allocations.length === 0) {
    return (
      <EmptyState
        message="No seat history"
        description="Seat assignments will appear here"
      />
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {allocations.map((alloc) => (
        <div key={alloc.id} className="py-3.5 flex items-start gap-3">
          {/* Seat icon */}
          <div className={`w-11 h-11 rounded-lg flex flex-col items-center
                           justify-center shrink-0
                           ${alloc.is_active ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <span className={`text-[10px] font-medium leading-none
                               ${alloc.is_active ? 'text-gray-300' : 'text-gray-400'}`}>
              Seat
            </span>
            <span className={`text-sm font-bold leading-none mt-0.5
                               ${alloc.is_active ? 'text-white' : 'text-gray-600'}`}>
              {alloc.seat_number}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {formatShift(alloc.shift)}
              </p>
              {alloc.is_active && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5
                                 bg-green-100 text-green-700 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              From {formatDate(alloc.start_date)}
              {alloc.end_date
                ? ` to ${formatDate(alloc.end_date)}`
                : ' — present'
              }
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}