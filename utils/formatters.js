// utils/formatters.js

// Format currency in Indian Rupees
// formatCurrency(500) → "₹500"
// formatCurrency(1250.5) → "₹1,251"
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format a date object or ISO string for display
// formatDate('2025-04-06') → "6 Apr 2025"
export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

// Format month and year for fee history display
// formatMonthYear('2025-04-01') → "April 2025"
export function formatMonthYear(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

// Format a phone number for display
// formatPhone('9876543210') → "+91 98765 43210"
export function formatPhone(phone) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

// Format a timestamp as a relative time string
// formatRelativeTime('2025-04-05T10:00:00Z') → "Yesterday" or "3 days ago"
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '—'
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(timestamp)
}

// Format shift for display
// formatShift('morning') → "Morning"
// formatShift('fulltime') → "Full Time"
export function formatShift(shift) {
  const map = {
    morning: 'Morning',
    evening: 'Evening',
    fulltime: 'Full Time',
  }
  return map[shift] || shift
}

// toDbDate — formats a Date object as YYYY-MM-DD using LOCAL timezone
// Never use .toISOString() for date-only strings — it converts to UTC
// and in IST (UTC+5:30) midnight local = previous day UTC, shifting date back by 1
export function toDbDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}