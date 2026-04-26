// app/(app)/dashboard/page.jsx

import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES, FEE_STATUS } from '@/utils/constants'
import { formatDate }     from '@/utils/formatters'
import { StatCards }      from './_components/StatCards'
import { OverdueList }    from './_components/OverdueList'
import { ExpiringList }   from './_components/ExpiringList'
import { RecentActivity } from './_components/RecentActivity'
import { ErrorState }     from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildActivityDescription(action, newData) {
  try {
    const data = typeof newData === 'string' ? JSON.parse(newData) : newData
    switch (action) {
      case 'create_member':        return `${data?.name || 'Member'} was added`
      case 'record_payment':       return `₹${data?.amount_paid || ''} recorded`
      case 'mark_member_inactive': return `Member marked inactive`
      case 'end_allocation':       return `Seat allocation ended`
      case 'assign_seat':          return `Seat assigned`
      case 'update_member':        return `Member details updated`
      case 'delete_member':        return `Member archived`
      default:                     return action.replace(/_/g, ' ')
    }
  } catch {
    return action.replace(/_/g, ' ')
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const libraryId       = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  const now           = new Date()
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd      = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthStartStr = localDateStr(monthStart)
  const monthEndStr   = localDateStr(monthEnd)
  const todayStr      = localDateStr(now)
  const sevenDays     = new Date(now)
  sevenDays.setDate(sevenDays.getDate() + 7)
  const sevenDaysStr  = localDateStr(sevenDays)

  // All five queries run simultaneously — none depend on each other
  // No exact fee amount needed that's why fee structure query removed
  const [
    { data: rawMembers,     error: membersError  },
    { data: rawAllocations, error: allocError    },
    { data: rawPayments,    error: paymentsError },
    { count: totalSeats                          },
    { data: rawActivity,    error: activityError },
  ] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, status')
      .eq('library_id', libraryId)
      .neq('status', 'inactive')
      .is('deleted_at', null),

    supabase
      .from('seat_allocations')
      .select('id, seat_id, member_id, shift, seats(seat_number)')
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null),

    supabase
      .from('fee_payments')
      .select('id, member_id, amount_paid, period_start_date, period_end_date')
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('period_end_date', { ascending: false }),

    supabase
      .from('seats')
      .select('*', { count: 'exact', head: true })
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null),

    supabase
      .from('audit_logs')
      .select(`id, action, new_data, created_at, partners(name)`)
      .eq('library_id', libraryId)
      .in('action', [
        'create_member', 'record_payment', 'mark_member_inactive',
        'end_allocation', 'assign_seat', 'update_member', 'delete_member',
      ])
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  

  if (membersError) {
    console.error('[DashboardPage] members:', membersError.message)
    return <ErrorState message="Could not load member data." />
  }
  if (allocError) {
    console.error('[DashboardPage] allocations:', allocError.message)
    return <ErrorState message="Could not load seat data." />
  }
  if (paymentsError) {
    console.error('[DashboardPage] payments:', paymentsError.message)
    return <ErrorState message="Could not load payment data." />
  }

  // Lookup maps
  const latestPaymentByMember = {}
  ;(rawPayments || []).forEach((p) => {
    if (!latestPaymentByMember[p.member_id]) {
      latestPaymentByMember[p.member_id] = p
    }
  })

  const allocByMember = {}
  ;(rawAllocations || []).forEach((a) => {
    allocByMember[a.member_id] = {
      id:          a.id,
      shift:       a.shift,
      seat_id:     a.seat_id,
      seat_number: a.seats?.seat_number ?? null,
    }
  })

  // Fee status per member
  const membersWithStatus = (rawMembers || []).map((member) => {
    const lastPayment = latestPaymentByMember[member.id] || null
    const feeResult   = computeFeeStatus(lastPayment, gracePeriodDays)
    const alloc       = allocByMember[member.id] || null

    return {
      id:             member.id,
      name:           member.name,
      seat_number:    alloc?.seat_number ?? null,
      shift:          alloc?.shift ?? null,
      fee_status:     feeResult.status,
      days_overdue:   feeResult.daysOverdue || 0,
      days_left:      feeResult.daysLeft    || 0,
      last_period_end: lastPayment?.period_end_date || null,
    }
  })

  // Stats
  const total_active = membersWithStatus.length

  // Use seat_id (UUID) for deduplication — more reliable than seat_number
  const occupiedSeatIds = new Set(
    (rawAllocations || []).map((a) => a.seat_id).filter(Boolean)
  )
  const seats_occupied = occupiedSeatIds.size

  const collected_month = (rawPayments || [])
    .filter((p) =>
      p.period_start_date <= monthEndStr &&
      p.period_end_date   >= monthStartStr
    )
    .reduce((sum, p) => sum + Number(p.amount_paid), 0)

  const unpaidMembers = membersWithStatus.filter(
    (m) => m.fee_status !== FEE_STATUS.PAID
  )

  // Overdue list (top 5)
  const overdueMembers = [...unpaidMembers]
    .sort((a, b) => {
      const priority = { overdue: 0, grace: 1, unpaid: 2 }
      const pa = priority[a.fee_status] ?? 3
      const pb = priority[b.fee_status] ?? 3
      if (pa !== pb) return pa - pb
      if (a.fee_status === 'overdue') return b.days_overdue - a.days_overdue
      if (a.fee_status === 'grace')   return a.days_left - b.days_left
      return a.name.localeCompare(b.name)
    })
    .slice(0, 5)

  // Expiring this week
  const expiringMembers = membersWithStatus
    .filter((m) =>
      m.fee_status === FEE_STATUS.PAID &&
      m.last_period_end !== null &&
      m.last_period_end >= todayStr &&
      m.last_period_end <= sevenDaysStr
    )
    .sort((a, b) => a.last_period_end.localeCompare(b.last_period_end))
    .slice(0, 5)
    .map((m) => ({ ...m, expiry_date: m.last_period_end }))

  const activities = (rawActivity || []).map((a) => ({
    id:           a.id,
    action:       a.action,
    description:  buildActivityDescription(a.action, a.new_data),
    partner_name: a.partners?.name || 'Unknown',
    created_at:   a.created_at,
  }))

  const stats = {
    total_active,
    seats_occupied,
    seats_total:     totalSeats || 56,
    collected_month: Math.round(collected_month),
    unpaid_count:    unpaidMembers.length,
  }

  return (
    <div className="pb-24 space-y-5">
      <div className="px-4 pt-4">
        <p className="text-xs text-muted">
          {now.toLocaleDateString('en-IN', { weekday: 'long' })}
        </p>
        <p className="text-base font-bold text-primary">
          {now.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      <StatCards stats={stats} />

      <OverdueList
        members={overdueMembers}
        totalCount={unpaidMembers.length}
      />

      {expiringMembers.length > 0 && (
        <ExpiringList members={expiringMembers} />
      )}

      <RecentActivity activities={activities} />
    </div>
  )
}