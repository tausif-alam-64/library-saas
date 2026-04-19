// app/(app)/members/[id]/pay/page.jsx

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateProratedFee, nextPaymentPeriod, isFirstOfMonth } from '@/lib/calculations'
import { ROUTES, ROLES } from '@/utils/constants'
import { toDbDate } from '@/utils/formatters'
import { PaymentForm } from './_components/PaymentForm'
import { ErrorState } from '@/components/ui/ErrorState'

export default async function PayPage({ params }) {
  // Await params — Next.js 15+ requirement
  const { id } = await params

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select(`
      id, role, library_id,
      libraries(grace_period_days)
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  // Only primary partners can record payments
  if (partnerData.role !== ROLES.PRIMARY) {
    redirect(ROUTES.MEMBER_PROFILE(id))
  }

  const libraryId = partnerData.library_id

  // Fetch member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, status')
    .eq('id', id)
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .single()

  if (memberError || !member) notFound()

  // Inactive members cannot receive payments
  if (member.status === 'inactive') {
    redirect(ROUTES.MEMBER_PROFILE(id))
  }

  // Fetch active allocation to know their shift and fee
  const { data: allocation } = await supabase
    .from('seat_allocations')
    .select('shift, seats(seat_number)')
    .eq('member_id', id)
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  // Fetch current fee structure
  const { data: fees } = await supabase
    .from('fee_structures')
    .select('morning_fee, evening_fee, fulltime_fee')
    .eq('library_id', libraryId)
    .is('valid_until', null)
    .maybeSingle()

  // Fetch most recent payment to determine next period
  const { data: lastPaymentRaw } = await supabase
    .from('fee_payments')
    .select('period_end_date, amount_paid, is_prorated')
    .eq('member_id', id)
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('period_end_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch all active partners for "collected by" selector
  const { data: allPartners, error: partnersError } = await supabase
    .from('partners')
    .select('id, name, role')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('role', { ascending: false }) // primary first

  if (partnersError) {
    return <ErrorState message="Could not load partner data." />
  }

  // Determine shift fee
  const shift = allocation?.shift || 'morning'
  const shiftFeeMap = {
    morning:  Number(fees?.morning_fee  ?? 500),
    evening:  Number(fees?.evening_fee  ?? 500),
    fulltime: Number(fees?.fulltime_fee ?? 900),
  }
  const monthlyFee = shiftFeeMap[shift]

  // Compute the default period and amount for this payment
  let defaultPeriodStart, defaultPeriodEnd, defaultAmount, isProrated, daysRemaining

  if (lastPaymentRaw) {
    // Member has paid before — next period is the following month
    const next = nextPaymentPeriod(lastPaymentRaw.period_end_date)
    defaultPeriodStart = next.start
    defaultPeriodEnd = next.end
    defaultAmount = monthlyFee
    isProrated = false
    daysRemaining = null
  } else {
    // Never paid — first payment, likely prorated
    // Use today as join date reference since we don't know exact join date here
    // The librarian can adjust amount manually
    const today = toDbDate(new Date())

    if (isFirstOfMonth(today)) {
      const d = new Date(today)
      defaultPeriodStart = today
      defaultPeriodEnd = toDbDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      defaultAmount = monthlyFee
      isProrated = false
      daysRemaining = null
    } else {
      const prorated = calculateProratedFee(today, monthlyFee)
      defaultPeriodStart = prorated.periodStart
      defaultPeriodEnd = prorated.periodEnd
      defaultAmount = prorated.amount
      isProrated = true
      daysRemaining = prorated.daysRemaining
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
  }

  return <PaymentForm paymentContext={paymentContext} />
}