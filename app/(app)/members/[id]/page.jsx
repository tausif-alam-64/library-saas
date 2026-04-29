// app/(app)/members/[id]/page.jsx

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeFeeStatus, nextPaymentPeriod, isFirstOfMonth, calculateProratedFee } from '@/lib/calculations'
import { ROUTES } from '@/utils/constants'
import { MemberHeader } from './_components/MemberHeader'
import { FeeSection } from './_components/FeeSection'
import { PaymentHistory } from './_components/PaymentHistory'
import { AllocationHistory } from './_components/AllocationHistory'
import { MemberActions } from './_components/MemberActions'
import { toDbDate } from '@/utils/formatters'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function MemberProfilePage({ params }) {
  // In Next.js 15+, params is a Promise — must be awaited before accessing properties
  const {id} = await params

  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const libraryId = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

   // All five queries run in parallel — none depend on each other
  const [
    { data: member,      error: memberError      },
    { data: rawCurrentAlloc                       },
    { data: rawPayments                           },
    { data: rawAllocations                        },
    { data: feeStructure                          },
  ] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, phone, address, aadhar_last4, photo_url, join_date, status, notes')
      .eq('id', id)
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .single(),

    supabase
      .from('seat_allocations')
      .select('id, shift, start_date, seats(seat_number, id)')
      .eq('member_id', id)
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),

    supabase
      .from('fee_payments')
      .select(`
        id, amount_paid, is_prorated, days_covered,
        period_start_date, period_end_date,
        paid_on, payment_mode, notes,
        partners(name)
      `)
      .eq('member_id', id)
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('period_end_date', { ascending: false }),

    supabase
      .from('seat_allocations')
      .select('id, shift, start_date, end_date, is_active, seats(seat_number)')
      .eq('member_id', id)
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false }),

    supabase
      .from('fee_structures')
      .select('morning_fee, evening_fee, fulltime_fee')
      .eq('library_id', libraryId)
      .is('valid_until', null)
      .maybeSingle(),
  ])

  if (memberError || !member) {
    notFound()
  }

  const currentAllocation = rawCurrentAlloc ? {
    id: rawCurrentAlloc.id,
    shift: rawCurrentAlloc.shift,
    start_date: rawCurrentAlloc.start_date,
    seat_number: rawCurrentAlloc.seats?.seat_number ?? null,
    seat_id: rawCurrentAlloc.seats?.id ?? null,
  } : null

  const payments = (rawPayments || []).map((p) => ({
    id: p.id,
    amount_paid: Number(p.amount_paid),
    is_prorated: p.is_prorated,
    days_covered: p.days_covered,
    period_start_date: p.period_start_date,
    period_end_date: p.period_end_date,
    paid_on: p.paid_on,
    payment_mode: p.payment_mode,
    notes: p.notes,
    collected_by_partner_name: p.partners?.name ?? 'Unknown',
  }))

  const allocations = (rawAllocations || []).map((a) => ({
    id: a.id,
    shift: a.shift,
    start_date: a.start_date,
    end_date: a.end_date,
    is_active: a.is_active,
    seat_number: a.seats?.seat_number ?? null,
  }))

  // Compute fee info for FeeSection
  const lastPayment = payments.length > 0 ? payments[0] : null
  let feeComputed = computeFeeStatus(lastPayment, gracePeriodDays)

  // Current amount due based on their shift
  const shiftFeeMap = {
    morning: feeStructure?.morning_fee ?? 500,
    evening: feeStructure?.evening_fee ?? 500,
    fulltime: feeStructure?.fulltime_fee ?? 900,
  }

  // i did here let in place of const
  let amountDue = currentAllocation
    ? Number(shiftFeeMap[currentAllocation.shift] || 500)
    : null

  // Determine the current payment period
  // If they have a last payment, the current period is the next one
  // If they have never paid, the current period starts from join date
  let currentPeriodStart, currentPeriodEnd

  if (lastPayment) {
    const next = nextPaymentPeriod(lastPayment.period_end_date)

  // Returning member detection:
  // If the computed next period starts BEFORE the current month,
  // the member was inactive for one or more months.
  // They do not owe for the months they were gone — they were not a member.
  // Treat them as starting fresh: collect for the current month only.
  const today              = new Date()
  const firstOfThisMonth   = toDbDate(new Date(today.getFullYear(), today.getMonth(), 1))
  

  if (next.start < firstOfThisMonth) {
    // Returning member — last payment was more than one month ago
  // Use TODAY as period start (their reactivation date), not the 1st of the month
  // This matches what pay/page.jsx will compute as the default period
  const todayStr = toDbDate(today)

  if (isFirstOfMonth(todayStr)) {
    // Rejoined exactly on the 1st — full month, no proration needed
    currentPeriodStart = firstOfThisMonth
    currentPeriodEnd   = toDbDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    // amountDue stays as the full monthly fee
  } else {
    // Rejoined mid-month — prorate from today to end of month
    const shiftFee = amountDue || 500
    const prorated = calculateProratedFee(todayStr, shiftFee)
    currentPeriodStart = prorated.periodStart  // = todayStr
    currentPeriodEnd   = prorated.periodEnd
    amountDue          = prorated.amount       // prorated amount shown on profile
  }

  feeComputed = { status: 'unpaid', daysOverdue: 0, daysLeft: 0 }
  } else {
    // Normal case — active member whose last payment was recent
    currentPeriodStart = next.start
    currentPeriodEnd   = next.end
  }
  } else {
  
  // No payment ever — show the correct prorated first period
  // based on join_date, not today's date
  if (isFirstOfMonth(member.join_date)) {
    const [jy, jm] = member.join_date.split('-').map(Number)
    currentPeriodStart = member.join_date
    currentPeriodEnd   = toDbDate(new Date(jy, jm, 0))
  } else {
    // Member joined mid-month — prorate from join_date
    // This matches exactly what pay/page.jsx computes as the default
    const shiftFee = amountDue || 500
    const prorated = calculateProratedFee(member.join_date, shiftFee)
    currentPeriodStart = prorated.periodStart
    currentPeriodEnd   = prorated.periodEnd
    amountDue = prorated.amount

  }
}

  const feeInfo = {
    status: feeComputed.status,
    daysOverdue: feeComputed.daysOverdue || 0,
    daysLeft: feeComputed.daysLeft || 0,
    currentPeriodStart,
    currentPeriodEnd,
    amountDue,
    lastPayment,
    memberStatus: member.status,
  }

  return (
    <div className="pb-4 relative">
      {/* Header — name, avatar, seat, phone */}
      <div className="flex items-start">
        <div className="flex-1">
          <MemberHeader
            member={member}
            currentAllocation={currentAllocation}
          />
        </div>
        {/* Three-dots action button — primary partner only (RoleGuard inside) */}
        <div className="absolute right-4 mt-5">
          <MemberActions
            member={member}
            currentAllocation={currentAllocation}
          />
        </div>
      </div>

      {/* Fee status + record payment */}
      <div className="mt-2">
        <FeeSection memberId={member.id} feeInfo={feeInfo} />
      </div>

      {/* Aadhar + notes section — only if data exists */}
      {(member.aadhar_last4 || member.notes) && (
        <div className="bg-white px-4 py-4 border-b border-gray-100 mt-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase
                         tracking-wide mb-3">
            Details
          </h2>
          {member.aadhar_last4 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-500">Aadhar (last 4)</span>
              <span className="text-sm font-medium text-gray-900">
                ••••  ••••  {member.aadhar_last4}
              </span>
            </div>
          )}
          {member.notes && (
            <div className="mt-2 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-1">Note</p>
              <p className="text-sm text-amber-800">{member.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment history */}
      <div className="mt-2">
        <PaymentHistory payments={payments} />
      </div>

      {/* Seat allocation history */}
      <div className="mt-2">
        <AllocationHistory allocations={allocations} />
      </div>
    </div>
  )
}