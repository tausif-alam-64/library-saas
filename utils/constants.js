// utils/constants.js

export const SHIFTS = {
  MORNING: 'morning',
  EVENING: 'evening',
  FULLTIME: 'fulltime',
}

export const ROLES = {
  PRIMARY: 'primary',
  VIEWER: 'viewer',
}

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  OVERDUE: 'overdue',
  INACTIVE: 'inactive',
}

export const FEE_STATUS = {
  PAID: 'paid',
  GRACE: 'grace',
  OVERDUE: 'overdue',
  UNPAID: 'unpaid', // Never made any payment — brand new or first month
}

export const PAYMENT_MODES = {
  CASH: 'cash',
  UPI: 'upi',
}

export const PLANS = {
  TRIAL: 'trial',
  BASIC: 'basic',
  PRO: 'pro',
}

// TanStack Query cache keys
// Never type a query key string directly in a component
// When a key changes, update it here once — every component picks it up
export const QUERY_KEYS = {
  MEMBERS: 'members',
  MEMBER: 'member',
  DASHBOARD_STATS: 'dashboard-stats',
  PAYMENTS: 'payments',
  ALLOCATIONS: 'allocations',
  REPORTS: 'reports',
  PARTNERS: 'partners',
  FEE_STRUCTURES: 'fee-structures',
  SEATS: 'seats',
  AUDIT_LOGS: 'audit-logs',
}

// All app routes in one place
// Never type a path string directly in a component
// ROUTES.MEMBER_PROFILE(id) generates /members/uuid — no string concatenation anywhere
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SEATS: '/seats',
  MEMBERS: '/members',
  MEMBER_NEW: '/members/new',
  MEMBER_PROFILE: (id) => `/members/${id}`,
  MEMBER_PAY: (id) => `/members/${id}/pay`,
  REPORTS: '/reports',
  SETTINGS: '/settings',
  SETTINGS_PARTNERS: '/settings/partners',
  SETTINGS_SEATS: '/settings/seats',
  SETTINGS_FEES: '/settings/fees',
  PAYMENTS: '/payments',
}

// API error codes — match exactly what every API route returns
// Frontend error handlers check error.code against these constants
export const ERROR_CODES = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  SEAT_CONFLICT: 'SEAT_CONFLICT',
  DUPLICATE_PHONE: 'DUPLICATE_PHONE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
}