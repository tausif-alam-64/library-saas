// components/members/PaymentHistoryList.jsx
'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaymentDetailSheet } from './PaymentDetailSheet'

export function PaymentHistoryList({ payments = [] }) {
  const [selectedPayment, setSelectedPayment] = useState(null)

  if (payments.length === 0) {
    return (
      <EmptyState
        message="No payments recorded yet"
        description="Payments will appear here once recorded"
      />
    )
  }

  return (
    <>
      <div className="divide-y divide-gray-50">
        {payments.map((payment) => {
          // Parse as local date components — prevents UTC month shift for IST users
          const [py, pm] = payment.period_start_date.split('-').map(Number)
          const monthShort = new Date(py, pm - 1, 1)
            .toLocaleString('en-IN', { month: 'short' })
          const yearShort = String(py).slice(2)

          return (
            <button
              key={payment.id}
              onClick={() => setSelectedPayment(payment)}
              className="w-full py-3.5 flex items-start gap-3
                         touch-manipulation text-left active:bg-gray-50"
            >
              {/* Month indicator */}
              <div className="w-11 h-11 rounded-lg bg-green-50 flex flex-col
                              items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-green-700
                                 leading-none uppercase">
                  {monthShort}
                </span>
                <span className="text-xs font-bold text-green-800
                                 leading-none mt-0.5">
                  {yearShort}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(payment.amount_paid)}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {payment.is_prorated && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5
                                       rounded-full bg-amber-50 text-amber-700">
                        prorated
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5
                                     rounded-full uppercase
                      ${payment.payment_mode === 'cash'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                      }`}>
                      {payment.payment_mode}
                    </span>
                  </div>
                </div>

                {/* Period covered — most important info */}
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDate(payment.period_start_date)} — {formatDate(payment.period_end_date)}
                </p>

                <p className="text-xs text-gray-400 mt-0.5">
                  Paid on {formatDate(payment.paid_on)}
                  {payment.is_prorated && payment.days_covered && (
                    <span className="ml-1.5">({payment.days_covered} days)</span>
                  )}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <PaymentDetailSheet
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  )
}