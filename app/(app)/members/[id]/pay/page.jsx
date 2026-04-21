// app/(app)/members/[id]/pay/page.jsx

import { redirect, notFound } from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import {
  calculateProratedFee,
  nextPaymentPeriod,
  isFirstOfMonth,
} from '@/lib/calculations'
import { ROUTES, ROLES } from '@/utils/constants'
import { PaymentForm }   from './_components/PaymentForm'
import { ErrorState }    from '@/components/ui/ErrorState'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function PayPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('id, role, library_id, libraries(grace_period_days)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  if (partnerData.role !== ROLES.PRIMARY) {
    redirect(ROUTES.MEMBER_PROFILE(id))
  }

  const libraryId = partnerData.library_id

  // Fetch member — we need join_date for proration
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, status, join_date')
    .eq('id', id)
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .single()

  if (memberError || !member) notFound()

  if (member.status === 'inactive') {
    redirect(ROUTES.MEMBER_PROFILE(id))
  }

  // Active allocation — tells us their shift
  const { data: allocation } = await supabase
    .from('seat_allocations')
    .select('shift, seats(seat_number)')
    .eq('member_id', id)
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  // Current fee structure
  const { data: fees } = await supabase
    .from('fee_structures')
    .select('morning_fee, evening_fee, fulltime_fee')
    .eq('library_id', libraryId)
    .is('valid_until', null)
    .maybeSingle()

  // Most recent payment — determines whether this is first payment or renewal
  const { data: lastPaymentRaw } = await supabase
    .from('fee_payments')
    .select('period_end_date, amount_paid, is_prorated')
    .eq('member_id', id)
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('period_end_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // All active partners for collected-by selector
  const { data: allPartners, error: partnersError } = await supabase
    .from('partners')
    .select('id, name, role')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('role', { ascending: false })

  if (partnersError) {
    return <ErrorState message="Could not load partner data." />
  }

  // Full monthly fee for their shift
  const shift = allocation?.shift || 'morning'
  const shiftFeeMap = {
    morning:  Number(fees?.morning_fee  ?? 500),
    evening:  Number(fees?.evening_fee  ?? 500),
    fulltime: Number(fees?.fulltime_fee ?? 900),
  }
  const monthlyFee = shiftFeeMap[shift]

  let defaultPeriodStart, defaultPeriodEnd, defaultAmount, isProrated, daysRemaining

  if (lastPaymentRaw) {
    // Renewal — next period after their last payment
    const next = nextPaymentPeriod(lastPaymentRaw.period_end_date)
    defaultPeriodStart = next.start
    defaultPeriodEnd   = next.end
    defaultAmount      = monthlyFee
    isProrated         = false
    daysRemaining      = null
  } else {
    // First payment ever — MUST use member.join_date, not today
    // The first payment covers from join_date to end of the join month
    // regardless of what today's date is
    const joinDate = member.join_date

    if (isFirstOfMonth(joinDate)) {
      // Joined on 1st — full month, no proration
      const [jy, jm] = joinDate.split('-').map(Number)
      defaultPeriodStart = joinDate
      defaultPeriodEnd   = localDateStr(new Date(jy, jm, 0))
      defaultAmount      = monthlyFee
      isProrated         = false
      daysRemaining      = null
    } else {
      // Joined mid-month — prorate from join_date to end of join month
      const prorated    = calculateProratedFee(joinDate, monthlyFee)
      defaultPeriodStart = prorated.periodStart  // = joinDate
      defaultPeriodEnd   = prorated.periodEnd
      defaultAmount      = prorated.amount
      isProrated         = true
      daysRemaining      = prorated.daysRemaining
    }
  }

  const paymentContext = {
    memberId:          member.id,
    memberName:        member.name,
    defaultAmount,
    defaultPeriodStart,
    defaultPeriodEnd,
    partners:          allPartners || [],
    currentPartnerId:  partnerData.id,
    isProrated,
    daysRemaining,
    // Pass full monthly fee so form can recalculate when period changes
    shiftFee:          monthlyFee,
    isFirstPayment:    !lastPaymentRaw,
  }

  return <PaymentForm paymentContext={paymentContext} />
}