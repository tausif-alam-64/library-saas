// app/(app)/members/page.jsx

import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES }        from '@/utils/constants'
import { MembersClient } from './_components/MembersClient'
import { ErrorState }    from '@/components/ui/ErrorState'

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)
console.time('ALL-FETCHES-OLD')
const membersStart = Date.now()
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('library_id, libraries(grace_period_days)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  const libraryId       = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  // Run all three independent queries in parallel
  const [
    { data: rawMembers,     error: membersError },
    { data: rawAllocations, error: allocError   },
    { data: rawPayments,    error: paymentsError },
  ] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, phone, address, photo_url, join_date, status, notes')
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),

    supabase
      .from('seat_allocations')
      .select('id, member_id, shift, seats(seat_number)')
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null),

    supabase
      .from('fee_payments')
      .select('member_id, period_end_date, period_start_date')
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('period_end_date', { ascending: false }),
  ])

  if (membersError) {
    console.error('[MembersPage] members:', membersError.message)
    return <ErrorState message="Could not load members. Please try again." />
  }
  if (allocError) {
    console.error('[MembersPage] allocations:', allocError.message)
    return <ErrorState message="Could not load seat data. Please try again." />
  }
  if (paymentsError) {
    console.error('[MembersPage] payments:', paymentsError.message)
    return <ErrorState message="Could not load payment data. Please try again." />
  }
  console.timeEnd('members-query')
console.timeEnd('ALL-FETCHES-OLD')
console.log(`OLD Total: ${Date.now() - membersStart}ms`)

  // O(1) lookup maps — built once, used N times
  const allocByMember = {}
  ;(rawAllocations || []).forEach((a) => {
    allocByMember[a.member_id] = {
      id:          a.id,
      shift:       a.shift,
      seat_number: a.seats?.seat_number ?? null,
    }
  })

  const paymentByMember = {}
  ;(rawPayments || []).forEach((p) => {
    if (!paymentByMember[p.member_id]) {
      paymentByMember[p.member_id] = p
    }
  })

  const members = (rawMembers || []).map((member) => {
    const alloc       = allocByMember[member.id] || null
    const lastPayment = paymentByMember[member.id] || null

    let feeStatus = null
    let daysOverdue = 0
    let daysLeft    = 0

    if (member.status !== 'inactive') {
      const computed = computeFeeStatus(lastPayment, gracePeriodDays)
      feeStatus   = computed.status
      daysOverdue = computed.daysOverdue || 0
      daysLeft    = computed.daysLeft    || 0
    }

    return {
      id:                 member.id,
      name:               member.name,
      phone:              member.phone,
      address:            member.address,
      photo_url:          member.photo_url,
      join_date:          member.join_date,
      status:             member.status,
      notes:              member.notes,
      current_allocation: alloc,
      fee_status:         feeStatus,
      days_overdue:       daysOverdue,
      days_left:          daysLeft,
    }
  })

  return (
    <MembersClient
      initialMembers={members}
      totalCount={members.length}
    />
  )
}