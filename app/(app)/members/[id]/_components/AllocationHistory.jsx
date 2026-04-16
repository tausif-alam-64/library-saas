// app/(app)/members/[id]/_components/AllocationHistory.jsx

import { AllocationHistoryList } from '@/components/members/AllocationHistoryList'

export function AllocationHistory({ allocations }) {
  return (
    <div className="bg-white px-4 py-4 border-b border-gray-100">
      <h2 className="text-xs font-semibold text-gray-400 uppercase
                     tracking-wide mb-3">
        Seat History
      </h2>
      <AllocationHistoryList allocations={allocations} />
    </div>
  )
}