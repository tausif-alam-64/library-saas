// app/(app)/seats/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { SeatMapClient } from './_components/SeatMapClient'
import { ErrorState }   from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function SeatsPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const libraryId = partnerData.library_id

  // Two parallel queries — no payment query needed on this page
  // Fee status is shown on the member profile (tapped via bottom sheet View button)
  // Removing the payment query saves ~50–80ms and one full table scan
  const [
    { data: rawSeats,       error: seatsError },
    { data: rawAllocations, error: allocError },
  ] = await Promise.all([
    supabase
      .from('seats')
      .select('id, seat_number, row_label')
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('seat_number', { ascending: true }),

    supabase
      .from('seat_allocations')
      .select(`
        id, seat_id, member_id, shift,
        members ( id, name )
      `)
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .is('deleted_at', null),
  ])

  if (seatsError) {
    console.error('[SeatsPage] seats query failed:', seatsError.message)
    return <ErrorState message="Could not load seat data. Please try again." />
  }
  if (allocError) {
    console.error('[SeatsPage] allocations query failed:', allocError.message)
    return <ErrorState message="Could not load allocation data. Please try again." />
  }

  // Build allocation lookup by seat_id
  const allocBySeat = {}
  ;(rawAllocations || []).forEach((a) => {
    if (!allocBySeat[a.seat_id]) allocBySeat[a.seat_id] = []
    allocBySeat[a.seat_id].push(a)
  })

  const emptySlot = {
    occupied: false, member_id: null, member_name: null,
    // fee_status intentionally null — not computed on this page
    // View the member profile for full fee details
    fee_status: null, allocation_id: null,
  }

  const seats = (rawSeats || []).map((seat) => {
    const allocs        = allocBySeat[seat.id] || []
    const fulltimeAlloc = allocs.find((a) => a.shift === 'fulltime')
    const morningAlloc  = allocs.find((a) => a.shift === 'morning')
    const eveningAlloc  = allocs.find((a) => a.shift === 'evening')

    function buildSlot(alloc) {
      if (!alloc) return emptySlot
      return {
        occupied:      true,
        member_id:     alloc.member_id,
        member_name:   alloc.members?.name || null,
        fee_status:    null,
        allocation_id: alloc.id,
      }
    }

    if (fulltimeAlloc) {
      const slot = buildSlot(fulltimeAlloc)
      return {
        id: seat.id, seat_number: seat.seat_number,
        row_label: seat.row_label,
        morning: slot, evening: slot, is_fulltime: true,
      }
    }

    return {
      id: seat.id, seat_number: seat.seat_number,
      row_label: seat.row_label,
      morning: buildSlot(morningAlloc),
      evening: buildSlot(eveningAlloc),
      is_fulltime: false,
    }
  })

  const occupiedCount = seats.filter(
    (s) => s.morning?.occupied && s.evening?.occupied
  ).length
  const freeCount = seats.filter(
    (s) => !s.morning?.occupied && !s.evening?.occupied
  ).length

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {occupiedCount} of {seats.length} seats fully occupied
          </p>
          <span className="text-xs font-medium px-2 py-1
                           bg-green-50 text-green-700 rounded-full">
            {freeCount} free
          </span>
        </div>
      </div>
      <SeatMapClient initialSeats={seats} />
    </div>
  )
}