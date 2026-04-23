// app/(app)/reports/page.jsx

import { redirect }  from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES, FEE_STATUS } from '@/utils/constants'
import { formatCurrency, formatShift } from '@/utils/formatters'
import { MonthSelectorClient }  from './_components/MonthSelectorClient'
import { ReportSummary }        from './_components/ReportSummary'
import { PartnerBreakdown }     from './_components/PartnerBreakdown'
import { PaidList }             from './_components/PaidList'
import { UnpaidList }           from './_components/UnpaidList'
import { ErrorState }           from '@/components/ui/ErrorState'
import { ShareButton } from './_components/ShareButton'
import Link from 'next/link'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function ReportsPage({ searchParams }) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select(`
      id, name, role, library_id,
      libraries ( id, name, grace_period_days )
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  const libraryId       = partnerData.library_id
  const libraryName     = partnerData.libraries?.name || 'Library'
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  // ── Resolve month/year from URL params ────────────────────────────────────
  const now         = new Date()
  // searchParams may be a Promise in Next.js 15+ — await it
  const resolvedParams = await searchParams
  const reqMonth    = parseInt(resolvedParams?.month) || now.getMonth() + 1
  const reqYear     = parseInt(resolvedParams?.year)  || now.getFullYear()

  // Clamp to valid range — cannot view future months
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()
  const isInFuture   =
    reqYear > currentYear ||
    (reqYear === currentYear && reqMonth > currentMonth)

  const month = isInFuture ? currentMonth : reqMonth
  const year  = isInFuture ? currentYear  : reqYear

  // Month boundaries
  const monthStart    = new Date(year, month - 1, 1)
  const monthEnd      = new Date(year, month, 0)
  const monthStartStr = localDateStr(monthStart)
  const monthEndStr   = localDateStr(monthEnd)

  // ── Query 1: All active members ───────────────────────────────────────────
  const { data: rawMembers, error: membersError } = await supabase
    .from('members')
    .select('id, name, status')
    .eq('library_id', libraryId)
    .neq('status', 'inactive')
    .is('deleted_at', null)

  if (membersError) {
    return <ErrorState message="Could not load member data." />
  }

  // ── Query 2: All active allocations ───────────────────────────────────────
  const { data: rawAllocations } = await supabase
    .from('seat_allocations')
    .select('member_id, shift, seats(seat_number)')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  // ── Query 3: Fee structure ────────────────────────────────────────────────
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

  // ── Query 4: All payments (for status + this month's data) ────────────────
  const { data: allPayments } = await supabase
    .from('fee_payments')
    .select('id, member_id, amount_paid, period_start_date, period_end_date, paid_on, payment_mode, collected_by_partner_id')
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('period_end_date', { ascending: false })

  // Payments that overlap the selected month
  const monthPayments = (allPayments || []).filter(
    (p) =>
      p.period_start_date <= monthEndStr &&
      p.period_end_date   >= monthStartStr
  )

  // ── Query 5: Partners (for collected-by names) ────────────────────────────
  const { data: allPartners } = await supabase
    .from('partners')
    .select('id, name')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  const partnerMap = {}
  ;(allPartners || []).forEach((p) => { partnerMap[p.id] = p.name })

  // ── Build lookup maps ─────────────────────────────────────────────────────

  // Latest payment per member (across all time — for status computation)
  const latestPaymentByMember = {}
  ;(allPayments || []).forEach((p) => {
    if (!latestPaymentByMember[p.member_id]) {
      latestPaymentByMember[p.member_id] = p
    }
  })

  // Month payment per member (which members paid this month)
  const monthPaymentByMember = {}
  monthPayments.forEach((p) => {
    if (!monthPaymentByMember[p.member_id]) {
      monthPaymentByMember[p.member_id] = p
    }
  })

  // Allocation per member
  const allocByMember = {}
  ;(rawAllocations || []).forEach((a) => {
    allocByMember[a.member_id] = {
      shift:       a.shift,
      seat_number: a.seats?.seat_number ?? null,
    }
  })

  // Set of member IDs who have ANY payment overlapping this month
  const membersPaidThisMonth = new Set(monthPayments.map((p) => p.member_id))
  

  // ── Per-member data for status + display ─────────────────────────────────
  const membersData = (rawMembers || []).map((m) => {
    const latestPayment = latestPaymentByMember[m.id] || null
    const alloc         = allocByMember[m.id] || null
    const feeResult     = computeFeeStatus(latestPayment, gracePeriodDays)
    const shiftFee      = alloc ? fees[alloc.shift] || 500 : 500

    const paidThisMonth = membersPaidThisMonth.has(m.id)

    return {
      id:            m.id,
      name:          m.name,
      seat_number:   alloc?.seat_number ?? null,
      shift:         alloc?.shift ?? null,
      fee_status:    feeResult.status,
      days_overdue:  feeResult.daysOverdue || 0,
      days_left:     feeResult.daysLeft    || 0,
      amount_due:    shiftFee,
      paid_this_month: paidThisMonth,
    }
  })

  // ── Paid list: every payment row for this month (not one per member) ─────
  // Sort by paid_on descending so newest payments are at top
  const paidPayments = monthPayments
    .map((p) => {
      const member = (rawMembers || []).find((m) => m.id === p.member_id)
      const alloc  = allocByMember[p.member_id] || null
      return {
        id:                        p.id,
        member_id:                 p.member_id,
        name:                      member?.name || 'Unknown',
        seat_number:               alloc?.seat_number ?? null,
        shift:                     alloc?.shift ?? null,
        amount_paid:               Number(p.amount_paid),
        paid_on:                   p.paid_on,
        payment_mode:              p.payment_mode,
        collected_by_partner_name: partnerMap[p.collected_by_partner_id] || 'Unknown',
      }
    })
    .sort((a, b) => (b.paid_on > a.paid_on ? 1 : -1))

    // ── Unpaid members ────────────────────────────────────────────────────────
  const unpaidMembers = membersData
    .filter((m) => !m.paid_this_month)
    .sort((a, b) => {
      const priority = { overdue: 0, grace: 1, unpaid: 2, paid: 3 }
      const pa = priority[a.fee_status] ?? 3
      const pb = priority[b.fee_status] ?? 3
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name)
    })

  // ── Correctly sum ALL payments in the month ─────────────────────────────
  // Critical fix: do NOT group by member — sum every payment row directly
  // A member may have multiple payments overlapping the month (edge case)
  // and all should count toward the total
  const fee_collected = Math.round(
    monthPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  )

  // ── Summary ───────────────────────────────────────────────────────────────
  // collection_rate is member-count based, not money based
  // Money-based rate is misleading when prorated payments exist
  const paid_member_count   = membersPaidThisMonth.size
  const total_member_count  = membersData.length
  const collection_rate     = total_member_count > 0
    ? Math.round((paid_member_count / total_member_count) * 100)
    : 0

  const fee_pending = Math.round(
    unpaidMembers.reduce((sum, m) => sum + m.amount_due, 0)
  )

  const summary = {
    total_members:    total_member_count,
    fee_collected,
    fee_pending,
    collection_rate,
    paid_count:       paid_member_count,
    unpaid_count:     unpaidMembers.length,
  }

  // ── Per-partner breakdown ─────────────────────────────────────────────────
  const partnerTotals = {}
  monthPayments.forEach((p) => {
    const pid = p.collected_by_partner_id
    if (!partnerTotals[pid]) {
      partnerTotals[pid] = {
        id:            pid,
        name:          partnerMap[pid] || 'Unknown',
        collected:     0,
        payment_count: 0,
      }
    }
    partnerTotals[pid].collected     += Number(p.amount_paid)
    partnerTotals[pid].payment_count += 1
  })

  const partnerBreakdown = Object.values(partnerTotals)
    .map((p) => ({ ...p, collected: Math.round(p.collected) }))
    .sort((a, b) => b.collected - a.collected)

  // ── WhatsApp share text ───────────────────────────────────────────────────
  const monthLabel = monthStart.toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  })

  const shareLines = [
    `${monthLabel} Report — ${libraryName}`,
    `Active members: ${membersData.length}`,
    `Collected: ${formatCurrency(fee_collected)}`,
    `Pending: ${formatCurrency(fee_pending)}`,
    `Collection rate: ${collection_rate}%`,
    '',
  ]

  if (partnerBreakdown.length > 0) {
    shareLines.push('Collections by partner:')
    partnerBreakdown.forEach((p) => {
      shareLines.push(`  ${p.name}: ${formatCurrency(p.collected)} (${p.payment_count} payments)`)
    })
    shareLines.push('')
  }

  if (unpaidMembers.length > 0) {
    shareLines.push(`Pending members (${unpaidMembers.length}):`)
    unpaidMembers.slice(0, 20).forEach((m) => {
      const seat = m.seat_number ? `Seat ${m.seat_number}` : 'No seat'
      const shift = m.shift ? formatShift(m.shift) : ''
      shareLines.push(`  ${m.name} — ${seat} ${shift} — ${formatCurrency(m.amount_due)}`)
    })
    if (unpaidMembers.length > 20) {
      shareLines.push(`  ...and ${unpaidMembers.length - 20} more`)
    }
  }

  const shareText = shareLines.join('\n')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24 space-y-5">
      {/* Month selector + share */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <MonthSelectorClient month={month} year={year} />
          </div>
          <Link
             href={ROUTES.PAYMENTS}
             className="flex items-center gap-1 h-9 px-3 rounded-xl
                         bg-gray-100 text-gray-700 text-xs font-semibold
                         active:bg-gray-200 touch-manipulation no-underline shrink-0"
             >
                All payments
             </Link>
          {/* WhatsApp share — client component embedded */}
          <ShareButton shareText={shareText} />
          
        </div>
      </div>

      {/* Summary */}
      <ReportSummary summary={summary} />

      {/* Partner breakdown */}
      {partnerBreakdown.length > 0 && (
        <PartnerBreakdown
          partners={partnerBreakdown}
          total={fee_collected}
        />
      )}

      {/* Unpaid members */}
      <UnpaidList members={unpaidMembers} />

      {/* Paid members */}
      <PaidList payments={paidPayments} />
    </div>
  )
}
