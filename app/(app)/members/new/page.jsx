// app/(app)/members/new/page.jsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES, ROLES } from '@/utils/constants'
import { AddMemberForm } from './_components/AddMemberForm'
import { ErrorState } from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function NewMemberPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  if (partnerData.role !== ROLES.PRIMARY) {
    redirect(ROUTES.MEMBERS)
  }

  const libraryId = partnerData.library_id

  // Both independent — run in parallel
  const [
    { data: fees,     error: feesError  },
    { data: rawSeats, error: seatsError },
  ] = await Promise.all([
    supabase
      .from('fee_structures')
      .select('morning_fee, evening_fee, fulltime_fee, valid_from')
      .eq('library_id', libraryId)
      .is('valid_until', null)
      .maybeSingle(),

    supabase
      .from('seats')
      .select(`
        id, seat_number, row_label,
        seat_allocations(id, shift, member_id, is_active, members(name))
      `)
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('seat_number', { ascending: true }),
  ])

  if (feesError) {
    return <ErrorState message="Could not load fee structure. Please try again." />
  }

  if (seatsError) {
    return <ErrorState message="Could not load seat data. Please try again." />
  }

  // Transform into the same shape useSeatsStore expects
  const emptySlot = {
    occupied: false,
    member_id: null,
    member_name: null,
    fee_status: null,
    allocation_id: null,
  }

  const seats = (rawSeats || []).map((seat) => {
    const activeAllocs = (seat.seat_allocations || []).filter((a) => a.is_active)
    const fulltimeAlloc = activeAllocs.find((a) => a.shift === 'fulltime')
    const morningAlloc  = activeAllocs.find((a) => a.shift === 'morning')
    const eveningAlloc  = activeAllocs.find((a) => a.shift === 'evening')

    function buildSlot(alloc) {
      if (!alloc) return emptySlot
      return {
        occupied: true,
        member_id: alloc.member_id,
        member_name: alloc.members?.name || null,
        fee_status: null,
        allocation_id: alloc.id,
      }
    }

    if (fulltimeAlloc) {
      const slot = buildSlot(fulltimeAlloc)
      return {
        id: seat.id,
        seat_number: seat.seat_number,
        row_label: seat.row_label,
        morning: slot,
        evening: slot,
        is_fulltime: true,
      }
    }

    return {
      id: seat.id,
      seat_number: seat.seat_number,
      row_label: seat.row_label,
      morning: buildSlot(morningAlloc),
      evening: buildSlot(eveningAlloc),
      is_fulltime: false,
    }
  })

  return (
    <AddMemberForm
      fees={fees || { morning_fee: 500, evening_fee: 500, fulltime_fee: 900 }}
      initialSeats={seats}
    />
  )
}