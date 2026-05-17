// app/(app)/dashboard/page.jsx

import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES, FEE_STATUS } from '@/utils/constants'
import { formatDate, getISTToday }     from '@/utils/formatters'
import { StatCards }      from './_components/StatCards'
import { OverdueList }    from './_components/OverdueList'
import { ExpiringList }   from './_components/ExpiringList'
import { RecentActivity } from './_components/RecentActivity'
import { ErrorState }     from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'
import { getISTDateStr, getISTMonthBounds } from '@/utils/formatters'



function buildActivityDescription(action, newData) {
  try {
    const data = typeof newData === 'string' ? JSON.parse(newData) : newData
    switch (action) {
      case 'create_member':        return `${data?.name || 'Member'} was added`
      case 'record_payment':       return `₹${data?.amount_paid || ''} recorded`
      case 'mark_member_inactive': return `Member marked inactive`
      case 'reactivate_member':    return `Member reactivated`
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

  const { year: istYear, month: istMonth, dateStr: todayStr, day: istDay } = getISTToday()

  const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
  const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
   
  // Compute IST day of week
  const istDate    = new Date(istYear, istMonth - 1, istDay)
  const dayName    = DAY_NAMES[istDate.getDay()]
  const monthName  = MONTH_NAMES[istMonth - 1]
  
  const monthStartStr  = `${istYear}-${String(istMonth).padStart(2, '0')}-01`
  const lastDay        = new Date(istYear, istMonth, 0).getDate()  // day 0 of next month = last of this
  const monthEndStr    = `${istYear}-${String(istMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const sevenDaysLater = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000)
  const sevenDaysStr   = [
    sevenDaysLater.getUTCFullYear(),
    String(sevenDaysLater.getUTCMonth() + 1).padStart(2, '0'),
    String(sevenDaysLater.getUTCDate()).padStart(2, '0'),
  ].join('-')

  // All five queries run simultaneously — none depend on each other
  // No exact fee amount needed that's why fee structure query removed
  const [
    { data: rawMembers,     error: membersError  },
    { data: rawAllocations, error: allocError    },
    { data: rawPayments,    error: paymentsError },
    { count: totalSeats                          },
    { data: rawActivity,    error: activityError },
    { data: allPartners                          },
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
      .select(`id, action, new_data, created_at, partner_id`)
      .eq('library_id', libraryId)
      .in('action', [
        'create_member', 'record_payment', 'mark_member_inactive','reactivate_member',
        'end_allocation', 'assign_seat', 'update_member', 'delete_member',
      ])
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('partners')
      .select('id, name')
      .eq('library_id', libraryId)
      .is('deleted_at', null),
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
  if (activityError) {
    // Non-critical — log but do not crash the dashboard
    console.error('[DashboardPage] activity query:', activityError.message)
    // rawActivity will be null — activities array will be empty — that is fine
  }

  const partnerNameMap = {}
  ;(allPartners || []).forEach((p) => { partnerNameMap[p.id] = p.name })

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
    partner_name: partnerNameMap[a.partner_id] || 'Unknown',
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
          {dayName}
        </p>
        <p className="text-base font-bold text-primary">
          {istDay} {monthName} {istYear}
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