// lib/calculations.js

import { FEE_STATUS } from '@/utils/constants'

// Calculate the prorated first payment for a student joining mid-month
//
// The librarian's rule: students pay only for the days they attend.
// Someone joining March 18th pays for March 18-31 (14 days).
// From April 1st onward, they pay the full monthly fee.
//
// Amount is rounded to the nearest ₹10 — this matches how the
// librarian calculates it mentally. So ₹226 becomes ₹230.
//
// Returns:
//   amount        — what to charge for the first period (rounded to ₹10)
//   daysInMonth   — total days in the joining month
//   daysRemaining — days from join date to end of month (inclusive)
//   periodStart   — join date (ISO string)
//   periodEnd     — last day of joining month (ISO string)
//   isProrated    — always true when this function is called

export function calculateProratedFee(joinDate, monthlyFee) {
  const join = new Date(joinDate)
  const year = join.getFullYear()
  const month = join.getMonth() // 0-indexed

  // Last day of the joining month
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const daysRemaining = daysInMonth - join.getDate() + 1 // inclusive

  const dailyRate = monthlyFee / daysInMonth
  const rawAmount = daysRemaining * dailyRate

  // Round to nearest ₹10
  const amount = Math.round(rawAmount / 10) * 10

  return {
    amount,
    daysInMonth,
    daysRemaining,
    periodStart: joinDate,
    periodEnd: lastDay.toISOString().split('T')[0],
    isProrated: true,
    dailyRate: Math.round(dailyRate),
  }
}

// Calculate the next full monthly payment period
// Called after the prorated first period to determine what April looks like
//
// nextFullPeriod('2025-03-18') → { start: '2025-04-01', end: '2025-04-30' }
export function nextFullPeriod(joinDate) {
  const join = new Date(joinDate)
  const nextMonth = new Date(join.getFullYear(), join.getMonth() + 1, 1)
  const lastDayOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)

  return {
    start: nextMonth.toISOString().split('T')[0],
    end: lastDayOfNextMonth.toISOString().split('T')[0],
  }
}

// Compute the current fee status of a member from their payment records
//
// This is NEVER stored in the database — it is always computed fresh.
// The members.status column is only for the 'inactive' manual override.
// Active and overdue are always derived from payment records + today's date.
//
// Parameters:
//   lastPayment       — the member's most recent fee_payment row (or null)
//   gracePeriodDays   — from libraries.grace_period_days (default 10)
//
// Returns:
//   status      — 'paid' | 'grace' | 'overdue'
//   daysOverdue — how many days past due (0 if paid or in grace)
//   daysLeft    — days remaining in grace period (only present when status='grace')
//   amountDue   — the fee that is owed (only present when overdue or grace)

export function computeFeeStatus(lastPayment, gracePeriodDays = 10) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // No payment ever recorded — member is overdue from day one
  if (!lastPayment) {
    return {
      status: FEE_STATUS.OVERDUE,
      daysOverdue: 0,
      amountDue: null,
    }
  }

  const periodEnd = new Date(lastPayment.period_end_date)
  periodEnd.setHours(0, 0, 0, 0)

  // Today is within or before the paid period — member is current
  if (today <= periodEnd) {
    return {
      status: FEE_STATUS.PAID,
      daysOverdue: 0,
    }
  }

  // Today is past period_end — calculate how many days overdue
  const msPerDay = 1000 * 60 * 60 * 24
  const daysPastDue = Math.floor((today - periodEnd) / msPerDay)

  // Still within grace period
  if (daysPastDue <= gracePeriodDays) {
    return {
      status: FEE_STATUS.GRACE,
      daysOverdue: daysPastDue,
      daysLeft: gracePeriodDays - daysPastDue,
    }
  }

  // Beyond grace period — genuinely overdue
  return {
    status: FEE_STATUS.OVERDUE,
    daysOverdue: daysPastDue,
  }
}

// Determine the current monthly payment period for a member
// Used to pre-fill the payment form with the correct dates
//
// If a member's last payment covered March, this returns April's dates
// nextPaymentPeriod('2025-03-01', '2025-03-31') → { start: '2025-04-01', end: '2025-04-30' }
export function nextPaymentPeriod(lastPeriodEnd) {
  const lastEnd = new Date(lastPeriodEnd)
  const nextStart = new Date(lastEnd.getFullYear(), lastEnd.getMonth() + 1, 1)
  const nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0)

  return {
    start: nextStart.toISOString().split('T')[0],
    end: nextEnd.toISOString().split('T')[0],
  }
}

// Check if a join date falls on the first of the month
// If yes, the first payment is a full month — no proration needed
export function isFirstOfMonth(dateString) {
  return new Date(dateString).getDate() === 1
}