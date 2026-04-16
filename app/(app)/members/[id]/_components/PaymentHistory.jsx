// app/(app)/members/[id]/_components/PaymentHistory.jsx

import { PaymentHistoryList } from '@/components/members/PaymentHistoryList'

export function PaymentHistory({ payments }) {
  return (
    <div className="bg-white px-4 py-4 border-b border-gray-100">
      <h2 className="text-xs font-semibold text-gray-400 uppercase
                     tracking-wide mb-3">
        Payment History
      </h2>
      <PaymentHistoryList payments={payments} />
    </div>
  )
}