// components/members/PaymentDetailSheet.jsx
'use client'

import { useEffect } from 'react'
import { formatCurrency, formatDate } from '@/utils/formatters'

// payment — full payment object with all fields
// onClose — function to close the sheet

export function PaymentDetailSheet({ payment, onClose }) {
  const isOpen = !!payment

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40
                    transition-opacity duration-300
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
        className={`fixed bottom-1 left-0 right-0 z-50 bg-white rounded-t-2xl
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom) + 64px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-2
                        border-b border-gray-100">
          <h2 className="text-base font-semibold text-primary">
            Payment details
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-full bg-gray-100 text-gray-500
                       touch-manipulation"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {payment && (
          <div className="px-4 py-4 space-y-0">

            {/* Amount — prominent */}
            <div className="flex items-center justify-center py-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(payment.amount_paid)}
                </p>
                {payment.is_prorated && (
                  <span className="inline-block mt-1 text-[10px] font-semibold
                                   uppercase tracking-wide text-amber-700
                                   bg-amber-50 px-2 py-0.5 rounded-full">
                    Prorated payment
                  </span>
                )}
              </div>
            </div>

            {/* Detail rows */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">Period covered</span>
                <span className="text-sm font-medium text-primary">
                  {formatDate(payment.period_start_date)} — {formatDate(payment.period_end_date)}
                </span>
              </div>

              {payment.is_prorated && payment.days_covered && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted">Days covered</span>
                  <span className="text-sm font-medium text-primary">
                    {payment.days_covered} days
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">Paid on</span>
                <span className="text-sm font-medium text-primary">
                  {formatDate(payment.paid_on)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">Payment mode</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase
                  ${payment.payment_mode === 'cash'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700'
                  }`}>
                  {payment.payment_mode}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">Collected by</span>
                <span className="text-sm font-medium text-primary">
                  {payment.collected_by_partner_name}
                </span>
              </div>

              {payment.notes && (
                <div className="px-4 py-3">
                  <p className="text-sm text-muted mb-1">Note</p>
                  <p className="text-sm text-primary">{payment.notes}</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  )
}