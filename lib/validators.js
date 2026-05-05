// lib/validators.js

function isValidDate(str) {
  // 1. Format must be YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false

  const [y, m, d] = str.split('-').map(Number)

  // 2. Check month range
  if (m < 1 || m > 12) return false

  // 3. Check day range (0 or negative)
  if (d < 1) return false

  // 4. Check actual days in that month
  const daysInMonth = new Date(y, m, 0).getDate()
  if (d > daysInMonth) return false

  return true
}

// Validate incoming data for creating a new member
// Returns null if valid, { message, field } if invalid
export function validateMember(body) {
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    return { message: 'Name must be at least 2 characters', field: 'name' }
  }

  if (!body.phone || typeof body.phone !== 'string') {
    return { message: 'Phone number is required', field: 'phone' }
  }

  const phoneDigits = body.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10) {
    return { message: 'Phone number must be exactly 10 digits', field: 'phone' }
  }

  if (!body.seat_id || typeof body.seat_id !== 'string') {
    return { message: 'A seat must be selected', field: 'seat_id' }
  }

  if (!body.shift || !['morning', 'evening', 'fulltime'].includes(body.shift)) {
    return { message: 'Shift must be morning, evening, or fulltime', field: 'shift' }
  }

  if (!body.join_date) {
    return { message: 'Join date is required', field: 'join_date' }
  }

  // join_date must be a valid date string
  if (!isValidDate(body.join_date)) {
    return { message: 'Join date is not a valid date (must be YYYY-MM-DD)', field: 'join_date' }
  }

  // aadhar_last4 must be exactly 4 digits if provided
  if (body.aadhar_last4 !== undefined && body.aadhar_last4 !== null && body.aadhar_last4 !== '') {
    if (!/^\d{4}$/.test(body.aadhar_last4)) {
      return { message: 'Aadhar must be exactly the last 4 digits', field: 'aadhar_last4' }
    }
  }

  return null
}

// Validate incoming data for recording a fee payment
export function validatePayment(body) {
  if (!body.amount_paid || typeof body.amount_paid !== 'number' || body.amount_paid <= 0) {
    return { message: 'Amount must be a positive number', field: 'amount_paid' }
  }

  if (!body.period_start_date) {
    return { message: 'Payment period start date is required', field: 'period_start_date' }
  }

  if (!body.period_end_date) {
    return { message: 'Payment period end date is required', field: 'period_end_date' }
  }
  
  if (!isValidDate(body.period_start_date)) {
    return { message: 'Period start date is not valid (YYYY-MM-DD)', field: 'period_start_date' }
  }

  if (!isValidDate(body.period_end_date)) {
    return { message: 'Period end date is not valid (YYYY-MM-DD)', field: 'period_end_date' }
  }

  if (body.period_start_date > body.period_end_date) {
    return { message: 'Period start must be before period end', field: 'period_start_date' }
  }

  if (!body.paid_on) {
    return { message: 'Payment date is required', field: 'paid_on' }
  }

  if (!isValidDate(body.paid_on)) {
    return { message: 'Payment date is not valid (YYYY-MM-DD)', field: 'paid_on' }
  }

  if (!body.payment_mode || !['cash', 'upi'].includes(body.payment_mode)) {
    return { message: 'Payment mode must be cash or upi', field: 'payment_mode' }
  }

  if (!body.collected_by_partner_id) {
    return { message: 'Collected by partner is required', field: 'collected_by_partner_id' }
  }

  return null
}

// Validate library settings update
export function validateLibrarySettings(body) {
  if (body.grace_period_days !== undefined) {
    const days = parseInt(body.grace_period_days)
    if (isNaN(days) || days < 0 || days > 30) {
      return { message: 'Grace period must be between 0 and 30 days', field: 'grace_period_days' }
    }
  }

  if (body.no_show_days !== undefined) {
    const days = parseInt(body.no_show_days)
    if (isNaN(days) || days < 1 || days > 60) {
      return { message: 'No-show days must be between 1 and 60', field: 'no_show_days' }
    }
  }

  return null
}

// Validate new partner creation
export function validatePartner(body) {
  if (!body.name || body.name.trim().length < 2) {
    return { message: 'Name must be at least 2 characters', field: 'name' }
  }

  if (!body.email || !body.email.includes('@')) {
    return { message: 'A valid email address is required', field: 'email' }
  }

  if (!body.role || !['primary', 'viewer'].includes(body.role)) {
    return { message: 'Role must be primary or viewer', field: 'role' }
  }

  if (!body.temporary_password || body.temporary_password.length < 8) {
    return { message: 'Temporary password must be at least 8 characters', field: 'temporary_password' }
  }

  return null
}