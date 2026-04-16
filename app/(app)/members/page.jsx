// app/(app)/members/page.jsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES } from '@/utils/constants'
import { MembersClient } from './_components/MembersClient'
import { ErrorState } from '@/components/ui/ErrorState'

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  // Get partner context — library_id and grace period days
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('library_id, libraries(grace_period_days)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) {
    return <ErrorState message="Could not load library data." />
  }

  const libraryId = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  // Query 1 — all members for this library (including inactive — filtered client-side)
  const { data: rawMembers, error: membersError } = await supabase
    .from('members')
    .select('id, name, phone, address, photo_url, join_date, status, notes')
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (membersError) {
    console.error('[MembersPage] members query failed:', membersError.message)
    return <ErrorState message="Could not load members. Please try again." />
  }

  // Query 2 — all active seat allocations with seat numbers
  const { data: rawAllocations, error: allocError } = await supabase
    .from('seat_allocations')
    .select('id, member_id, shift, seats(seat_number)')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (allocError) {
    console.error('[MembersPage] allocations query failed:', allocError.message)
    return <ErrorState message="Could not load seat data. Please try again." />
  }

  // Query 3 — latest fee payment per member
  // Fetch all payments ordered by period_end_date desc, keep first per member
  const { data: rawPayments, error: paymentsError } = await supabase
    .from('fee_payments')
    .select('member_id, period_end_date, period_start_date')
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('period_end_date', { ascending: false })

  if (paymentsError) {
    console.error('[MembersPage] payments query failed:', paymentsError.message)
    return <ErrorState message="Could not load payment data. Please try again." />
  }

  // Build lookup maps for O(1) access
  // alloc map: member_id → { id, shift, seat_number }
  const allocByMember = {}
  rawAllocations?.forEach((a) => {
    allocByMember[a.member_id] = {
      id: a.id,
      shift: a.shift,
      seat_number: a.seats?.seat_number ?? null,
    }
  })

  // payment map: member_id → most recent payment
  const paymentByMember = {}
  rawPayments?.forEach((p) => {
    if (!paymentByMember[p.member_id]) {
      paymentByMember[p.member_id] = p
    }
  })

  // Merge and compute fee status for each member
  const members = (rawMembers || []).map((member) => {
    const alloc = allocByMember[member.id] || null
    const lastPayment = paymentByMember[member.id] || null

    // Inactive members don't have a meaningful fee status
    let feeStatus = null
    let daysOverdue = 0
    let daysLeft = 0

    if (member.status !== 'inactive') {
      const computed = computeFeeStatus(lastPayment, gracePeriodDays)
      feeStatus = computed.status
      daysOverdue = computed.daysOverdue || 0
      daysLeft = computed.daysLeft || 0
    }

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      address: member.address,
      photo_url: member.photo_url,
      join_date: member.join_date,
      status: member.status,
      notes: member.notes,
      current_allocation: alloc,
      fee_status: feeStatus,
      days_overdue: daysOverdue,
      days_left: daysLeft,
    }
  })

  return (
    <MembersClient
      initialMembers={members}
      totalCount={members.length}
    />
  )
}