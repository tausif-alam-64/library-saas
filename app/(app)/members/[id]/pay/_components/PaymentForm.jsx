// app/(app)/members/[id]/pay/_components/PaymentForm.jsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { ROUTES, PAYMENT_MODES } from '@/utils/constants'
import { formatCurrency, toDbDate } from '@/utils/formatters'
import useUIStore              from '@/stores/useUIStore'

export function PaymentForm({ paymentContext }) {
  const router   = useRouter()
  const addToast = useUIStore((state) => state.addToast)

  const [amount,       setAmount]       = useState(String(paymentContext.defaultAmount || ''))
  const [periodStart,  setPeriodStart]  = useState(paymentContext.defaultPeriodStart || '')
  const [periodEnd,    setPeriodEnd]    = useState(paymentContext.defaultPeriodEnd || '')
  const [paidOn,       setPaidOn]       = useState(toDbDate(new Date()))
  const [paymentMode,  setPaymentMode]  = useState(PAYMENT_MODES.CASH)
  const [collectedBy,  setCollectedBy]  = useState(paymentContext.currentPartnerId || '')
  const [notes,        setNotes]        = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted,      setMounted]      = useState(false)
  const [errors,       setErrors]       = useState({})
  const [amountEdited, setAmountEdited] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Recalculate suggested amount when period start date changes
  // Only auto-recalculate if the user hasn't manually overridden the amount
  useEffect(() => {
    if (!periodStart || !periodEnd || amountEdited) return

    const [sy, sm, sd] = periodStart.split('-').map(Number)
    const [ey, em, ed] = periodEnd.split('-').map(Number)

    if (!sy || !sm || !sd || !ey || !em || !ed) return

    const startDate = new Date(sy, sm - 1, sd)
    const endDate   = new Date(ey, em - 1, ed)

    // Days covered (inclusive)
    const daysCovered = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    // Days in the month of the period start
    const daysInMonth = new Date(sy, sm, 0).getDate()

    const shiftFee = paymentContext.shiftFee || paymentContext.defaultAmount || 500

    if (daysCovered >= daysInMonth) {
      // Full month or more — use standard fee
      setAmount(String(shiftFee))
    } else {
      // Prorate based on days covered
      const dailyRate  = shiftFee / daysInMonth
      const prorated   = Math.round(dailyRate * daysCovered / 10) * 10
      setAmount(String(prorated))
    }
  }, [periodStart, periodEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const errs = {}
    const amt  = parseFloat(amount)

    if (!amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Enter a valid amount'
    }
    if (!periodStart) errs.periodStart = 'Period start date is required'
    if (!periodEnd)   errs.periodEnd   = 'Period end date is required'
    if (periodStart && periodEnd && periodStart > periodEnd) {
      errs.periodStart = 'Start date must be before end date'
    }
    if (!paidOn)       errs.paidOn      = 'Payment date is required'
    if (!collectedBy)  errs.collectedBy = 'Select who collected this payment'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/members/${paymentContext.memberId}/pay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid:             parseFloat(amount),
          period_start_date:       periodStart,
          period_end_date:         periodEnd,
          paid_on:                 paidOn,
          payment_mode:            paymentMode,
          collected_by_partner_id: collectedBy,
          is_prorated:             paymentContext.isProrated && !amountEdited,
          days_covered:            paymentContext.daysRemaining || null,
          notes:                   notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to record payment')
      }

      addToast(
        `${formatCurrency(parseFloat(amount))} recorded for ${paymentContext.memberName}`,
        'success'
      )

      router.push(ROUTES.MEMBER_PROFILE(paymentContext.memberId))
      router.refresh()

    } catch (err) {
      console.error('[PaymentForm] submit error:', err)
      addToast(err.message || 'Failed to record payment', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = (hasError) => `
    w-full h-11 px-3.5 bg-surface border rounded-xl
    text-sm text-primary outline-none
    focus:border-gray-400 focus:ring-1 focus:ring-gray-100
    transition-colors
    ${hasError ? 'border-danger' : 'border-gray-200'}
  `

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="px-4 pt-5 pb-36 space-y-5">

        {/* Member info banner */}
        <div className="bg-gray-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-muted">Recording payment for</p>
          <p className="text-sm font-bold text-primary mt-0.5">
            {paymentContext.memberName}
          </p>
          {paymentContext.isFirstPayment && (
            <p className="text-[10px] text-warning mt-1 font-medium">
              First payment — period is based on their join date
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500
                              uppercase tracking-wide">
              Amount received <span className="text-danger">*</span>
            </label>
            {/* Recalculate hint — shown after period change */}
            {!amountEdited && (
              <span className="text-[10px] text-muted">
                auto-calculated from period
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                             text-sm font-bold text-muted pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setAmountEdited(true)
              }}
              className={`${inputCls(!!errors.amount)} pl-8`}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-danger mt-1">{errors.amount}</p>
          )}
          {amountEdited && (
            <button
              type="button"
              onClick={() => {
                setAmountEdited(false)
                // Trigger recalculation by resetting periodStart state
                const s = periodStart
                setPeriodStart('')
                setTimeout(() => setPeriodStart(s), 0)
              }}
              className="text-[10px] text-info mt-1 underline touch-manipulation"
            >
              Reset to calculated amount
            </button>
          )}
        </div>

        {/* Payment mode */}
        <div>
          <label className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5">
            Payment mode <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3">
            {[
              { mode: PAYMENT_MODES.CASH, label: 'Cash' },
              { mode: PAYMENT_MODES.UPI,  label: 'UPI'  },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`
                  flex-1 h-14 rounded-2xl border-2 font-semibold text-sm
                  transition-all touch-manipulation
                  ${paymentMode === mode
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-surface text-gray-600 active:bg-gray-50'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment period */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide">
            Period covered <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-muted mb-1">From</p>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value)
                  // Reset amount-edited flag so recalculation kicks in
                  setAmountEdited(false)
                }}
                className={inputCls(!!errors.periodStart)}
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted mb-1">To</p>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value)
                  setAmountEdited(false)
                }}
                className={inputCls(!!errors.periodEnd)}
              />
            </div>
          </div>
          {(errors.periodStart || errors.periodEnd) && (
            <p className="text-xs text-danger">
              {errors.periodStart || errors.periodEnd}
            </p>
          )}
        </div>

        {/* Date paid */}
        <div>
          <label className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5">
            Date paid <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={paidOn}
            max={toDbDate(new Date())}
            onChange={(e) => setPaidOn(e.target.value)}
            className={inputCls(!!errors.paidOn)}
          />
          {errors.paidOn && (
            <p className="text-xs text-danger mt-1">{errors.paidOn}</p>
          )}
        </div>

        {/* Collected by */}
        <div>
          <label className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5">
            Collected by <span className="text-danger">*</span>
          </label>
          <div className="flex flex-col gap-2">
            {paymentContext.partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCollectedBy(p.id)}
                className={`
                  h-12 px-4 rounded-xl border-2 text-sm font-medium text-left
                  flex items-center gap-3 transition-all touch-manipulation
                  ${collectedBy === p.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 bg-surface text-gray-700 active:bg-gray-50'
                  }
                `}
              >
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center
                  justify-center shrink-0 transition-colors
                  ${collectedBy === p.id
                    ? 'border-primary bg-primary'
                    : 'border-gray-300'
                  }
                `}>
                  {collectedBy === p.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                {p.name}
                {p.id === paymentContext.currentPartnerId && (
                  <span className="text-[10px] text-muted ml-auto">You</span>
                )}
              </button>
            ))}
          </div>
          {errors.collectedBy && (
            <p className="text-xs text-danger mt-1">{errors.collectedBy}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Paid partial, balance next week"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface border border-gray-200
                       rounded-xl text-sm text-primary outline-none resize-none
                       focus:border-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Fixed submit bar */}
      {mounted && (
        <div
          className="fixed left-0 right-0 z-30 bg-surface border-t
                     border-gray-100 px-4 py-3"
          style={{
            bottom: 0,
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom) + 64px)',
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl
                       text-sm font-semibold disabled:bg-gray-300
                       active:opacity-90 touch-manipulation
                       flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10"
                    stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="white"
                    strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Recording...
              </>
            ) : (
              `Record ${amount ? formatCurrency(parseFloat(amount) || 0) : 'payment'}`
            )}
          </button>
        </div>
      )}
    </form>
  )
}