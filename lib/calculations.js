// lib/calculations.js

import { FEE_STATUS } from '@/utils/constants'

// Internal helper — formats Date as YYYY-MM-DD in local timezone
// This is the correct way to get date strings for database storage
// .toISOString() must never be used for date-only values — it converts
// to UTC which shifts dates backward for IST users (UTC+5:30)
function localDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function calculateProratedFee(joinDate, monthlyFee) {
  // Parse the date string as local date — not UTC
  // new Date('2026-04-19') parses as UTC midnight which is fine for extracting
  // year/month/day since we only care about those components
  const [year, month, dayNum] = joinDate.split('-').map(Number)
  // month - 1 because Date constructor is 0-indexed
  const join = new Date(year, month - 1, dayNum)

  const daysInMonth = new Date(year, month, 0).getDate() // last day of month
  const daysRemaining = daysInMonth - dayNum + 1 // inclusive

  const dailyRate = monthlyFee / daysInMonth
  const rawAmount = daysRemaining * dailyRate
  const amount = Math.round(rawAmount / 10) * 10

  // Last day of the joining month — use local date constructor
  const periodEnd = new Date(year, month, 0) // day 0 = last day of previous month

  return {
    amount,
    daysInMonth,
    daysRemaining,
    periodStart: joinDate,
    periodEnd: localDateString(periodEnd),
    isProrated: true,
    dailyRate: Math.round(dailyRate),
  }
}

export function nextFullPeriod(joinDate) {
  const [year, month] = joinDate.split('-').map(Number)
  // Next month start
  const nextStart = new Date(year, month, 1) // month is already 1-indexed from split
  // Last day of next month
  const nextEnd = new Date(year, month + 1, 0)

  return {
    start: localDateString(nextStart),
    end: localDateString(nextEnd),
  }
}

export function computeFeeStatus(lastPayment, gracePeriodDays = 10) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!lastPayment) {
    return {
      status: FEE_STATUS.UNPAID,
      daysOverdue: 0,
    }
  }

  // Parse period_end_date as local date components to avoid UTC shift
  const [endYear, endMonth, endDay] = lastPayment.period_end_date.split('-').map(Number)
  const periodEnd = new Date(endYear, endMonth - 1, endDay)
  periodEnd.setHours(0, 0, 0, 0)

  if (today <= periodEnd) {
    return {
      status: FEE_STATUS.PAID,
      daysOverdue: 0,
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const daysPastDue = Math.floor((today - periodEnd) / msPerDay)

  if (daysPastDue <= gracePeriodDays) {
    return {
      status: FEE_STATUS.GRACE,
      daysOverdue: daysPastDue,
      daysLeft: gracePeriodDays - daysPastDue,
    }
  }

  return {
    status: FEE_STATUS.OVERDUE,
    daysOverdue: daysPastDue,
  }
}

export function nextPaymentPeriod(lastPeriodEnd) {
  // Parse as local date components — never use new Date(string) for calculations
  const [year, month, day] = lastPeriodEnd.split('-').map(Number)
  
  // JavaScript handles month overflow correctly.
  // Start of next month
  const nextStart = new Date(year, month, 1) // month is 1-indexed from split, so this is correct
  // Last day of next month
  const nextEnd = new Date(year, month + 1, 0)

  return {
    start: localDateString(nextStart),
    end: localDateString(nextEnd),
  }
}

export function isFirstOfMonth(dateString) {
  const [, , day] = dateString.split('-').map(Number)
  return day === 1
}