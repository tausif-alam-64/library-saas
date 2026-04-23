// app/(app)/dashboard/page.jsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES, FEE_STATUS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { StatCards }      from './_components/StatCards'
import { OverdueList }    from './_components/OverdueList'
import { ExpiringList }   from './_components/ExpiringList'
import { RecentActivity } from './_components/RecentActivity'
import { ErrorState }     from '@/components/ui/ErrorState'

// Local date helper — same pattern as API routes
// Never imported from formatters to avoid server/client module confusion
function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Human-readable action description from audit log data
function buildActivityDescription(action, newData) {
  try {
    const data = typeof newData === 'string' ? JSON.parse(newData) : newData
    switch (action) {
      case 'create_member':
        return `${data?.name || 'Member'} was added`
      case 'record_payment':
        return `₹${data?.amount_paid || ''} recorded${data?.period_end_date ? ` for ${formatDate(data.period_end_date)}` : ''}`
      case 'mark_member_inactive':
        return `Member marked inactive${data?.reason ? ` — ${data.reason}` : ''}`
      case 'end_allocation':
        return `Seat allocation ended`
      case 'assign_seat':
        return `Seat assigned`
      case 'update_member':
        return `Member details updated`
      case 'delete_member':
        return `Member archived`
      default:
        return action.replace(/_/g, ' ')
    }
  } catch {
    return action.replace(/_/g, ' ')
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth check — middleware guarantees session but getUser() confirms token validity
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  // Get partner + library in one query
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select(`
      id, name, role, library_id,
      libraries (
        id, name, grace_period_days, no_show_days
      )
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  const libraryId       = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  // Current month boundaries in local timezone
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd       = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthStartStr  = localDateStr(monthStart)
  const monthEndStr    = localDateStr(monthEnd)
  const todayStr       = localDateStr(now)

  // 7 days from now for expiring calculation
  const sevenDaysLater = new Date(now)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const sevenDaysStr   = localDateStr(sevenDaysLater)

  // ── Query 1: All active members ───────────────────────────────────────────
  const { data: rawMembers, error: membersError } = await supabase
    .from('members')
    .select('id, name, status')
    .eq('library_id', libraryId)
    .neq('status', 'inactive')
    .is('deleted_at', null)

  if (membersError) {
    console.error('[DashboardPage] members query:', membersError.message)
    return <ErrorState message="Could not load member data." />
  }

  // ── Query 2: Active seat allocations with seat numbers + member names ─────
  const { data: rawAllocations, error: allocError } = await supabase
    .from('seat_allocations')
    .select(`
      id, seat_id, member_id, shift, is_active,
      seats ( seat_number )
    `)
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (allocError) {
    console.error('[DashboardPage] allocations query:', allocError.message)
    return <ErrorState message="Could not load seat data." />
  }

  // ── Query 3: All fee payments (for status + this month's total) ───────────
  // Fetch all payments — we need them for two purposes:
  // a) latest payment per member (for fee status computation)
  // b) payments that overlap current month (for collected total)
  const { data: rawPayments, error: paymentsError } = await supabase
    .from('fee_payments')
    .select('id, member_id, amount_paid, period_start_date, period_end_date')
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('period_end_date', { ascending: false })

  if (paymentsError) {
    console.error('[DashboardPage] payments query:', paymentsError.message)
    return <ErrorState message="Could not load payment data." />
  }

  // ── Query 4: Total seats count ────────────────────────────────────────────
  const { count: totalSeats } = await supabase
    .from('seats')
    .select('*', { count: 'exact', head: true })
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  // ── Query 5: Recent audit activity (last 5) ───────────────────────────────
  const { data: rawActivity, error: activityError } = await supabase
    .from('audit_logs')
    .select(`
      id, action, new_data, created_at,
      partners ( name )
    `)
    .eq('library_id', libraryId)
    .in('action', [
      'create_member',
      'record_payment',
      'mark_member_inactive',
      'end_allocation',
      'assign_seat',
      'update_member',
      'delete_member',
    ])
    .order('created_at', { ascending: false })
    .limit(5)

  if (activityError) {
    console.error('[DashboardPage] activity query:', activityError.message)
    // Non-critical — show dashboard without activity
  }

  // ── Query 6: Fee structure (for expected amounts) ─────────────────────────
  const { data: feeStructure } = await supabase
    .from('fee_structures')
    .select('morning_fee, evening_fee, fulltime_fee')
    .eq('library_id', libraryId)
    .is('valid_until', null)
    .maybeSingle()

  const fees = {
    morning:  Number(feeStructure?.morning_fee  ?? 500),
    evening:  Number(feeStructure?.evening_fee  ?? 500),
    fulltime: Number(feeStructure?.fulltime_fee ?? 900),
  }

  // ── Build lookup maps ─────────────────────────────────────────────────────

  // Latest payment per member (payments already sorted desc)
  const latestPaymentByMember = {}
  ;(rawPayments || []).forEach((p) => {
    if (!latestPaymentByMember[p.member_id]) {
      latestPaymentByMember[p.member_id] = p
    }
  })

  // Allocation per member
  const allocByMember = {}
  ;(rawAllocations || []).forEach((a) => {
    allocByMember[a.member_id] = {
      id:          a.id,
      shift:       a.shift,
      seat_number: a.seats?.seat_number ?? null,
    }
  })

  // ── Compute fee status for every active member ────────────────────────────
  const membersWithStatus = (rawMembers || []).map((member) => {
    const lastPayment = latestPaymentByMember[member.id] || null
    const feeResult   = computeFeeStatus(lastPayment, gracePeriodDays)
    const alloc       = allocByMember[member.id] || null
    const shiftFee    = alloc ? fees[alloc.shift] || 500 : 500

    return {
      id:          member.id,
      name:        member.name,
      seat_number: alloc?.seat_number ?? null,
      shift:       alloc?.shift ?? null,
      fee_status:  feeResult.status,
      days_overdue: feeResult.daysOverdue || 0,
      days_left:   feeResult.daysLeft || 0,
      amount_due:  feeResult.status !== FEE_STATUS.PAID ? shiftFee : 0,
      // For expiring: period_end_date of last payment
      last_period_end: lastPayment?.period_end_date || null,
    }
  })

  // ── Stat calculations ─────────────────────────────────────────────────────

  // Total active members (non-inactive)
  const total_active = membersWithStatus.length

  // Unique seats occupied (a fulltime allocation occupies one physical seat)
  const occupiedSeatIds = new Set(
  (rawAllocations || [])
    .map((a) => a.seat_id)  // seat_id from seat_allocations directly
    .filter(Boolean)
  )
  const seats_occupied = occupiedSeatIds.size

  // Fee collected this month — payments whose period overlaps current month
  const collected_month = (rawPayments || [])
    .filter((p) =>
      p.period_start_date <= monthEndStr &&
      p.period_end_date   >= monthStartStr
    )
    .reduce((sum, p) => sum + Number(p.amount_paid), 0)

  // Members who haven't paid this month (overdue, grace, or unpaid)
  const unpaidMembers = membersWithStatus.filter(
    (m) => m.fee_status !== FEE_STATUS.PAID
  )
  const unpaid_count = unpaidMembers.length

  // ── Overdue list (overdue + grace, max 5 shown) ───────────────────────────
  const overdueMembers = membersWithStatus
    .filter((m) =>
      m.fee_status === FEE_STATUS.OVERDUE ||
      m.fee_status === FEE_STATUS.GRACE   ||
      m.fee_status === FEE_STATUS.UNPAID
    )
    .sort((a, b) => {
      // Sort: overdue first (most days), then grace (least days left), then unpaid
      const priority = { overdue: 0, grace: 1, unpaid: 2 }
      const pa = priority[a.fee_status] ?? 3
      const pb = priority[b.fee_status] ?? 3
      if (pa !== pb) return pa - pb
      if (a.fee_status === 'overdue') return b.days_overdue - a.days_overdue
      if (a.fee_status === 'grace')   return a.days_left - b.days_left
      return a.name.localeCompare(b.name)
    })
    .slice(0, 5)

  // ── Expiring this week ────────────────────────────────────────────────────
  // Members whose last payment period ends between today and 7 days from now
  const expiringMembers = membersWithStatus
    .filter((m) =>
      m.fee_status === FEE_STATUS.PAID &&
      m.last_period_end !== null &&
      m.last_period_end >= todayStr &&
      m.last_period_end <= sevenDaysStr
    )
    .sort((a, b) => a.last_period_end.localeCompare(b.last_period_end))
    .slice(0, 5)
    .map((m) => ({
      ...m,
      expiry_date: m.last_period_end,
    }))

  // ── Format recent activity ────────────────────────────────────────────────
  const activities = (rawActivity || []).map((a) => ({
    id:           a.id,
    action:       a.action,
    description:  buildActivityDescription(a.action, a.new_data),
    partner_name: a.partners?.name || 'Unknown',
    created_at:   a.created_at,
  }))

  // ── Stats object ──────────────────────────────────────────────────────────
  const stats = {
    total_active,
    seats_occupied,
    seats_total:      totalSeats || 56,
    collected_month:  Math.round(collected_month),
    unpaid_count,
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24 space-y-5">
      {/* Date header */}
      <div className="px-4 pt-4">
        <p className="text-xs text-muted">
          {now.toLocaleDateString('en-IN', { weekday: 'long' })}
        </p>
        <p className="text-base font-bold text-primary">
          {now.toLocaleDateString('en-IN', {
            day:   'numeric',
            month: 'long',
            year:  'numeric',
          })}
        </p>
      </div>

      {/* 4 stat cards */}
      <StatCards stats={stats} />

      {/* Overdue + grace period members */}
      <OverdueList
        members={overdueMembers}
        totalCount={overdueMembers.length < unpaidMembers.length
          ? unpaidMembers.length
          : overdueMembers.length}
      />

      {/* Expiring this week — only shown if any exist */}
      {expiringMembers.length > 0 && (
        <ExpiringList members={expiringMembers} />
      )}

      {/* Recent activity */}
      <RecentActivity activities={activities} />
    </div>
  )
}