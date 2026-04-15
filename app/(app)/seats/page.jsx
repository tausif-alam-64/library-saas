// app/(app)/seats/page.jsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeFeeStatus } from '@/lib/calculations'
import { ROUTES } from '@/utils/constants'
import { SeatMapClient } from './_components/SeatMapClient'
import { ErrorState } from '@/components/ui/ErrorState'

// Transform raw Supabase data into the format useSeatsStore expects
// This runs on the server — no cost to the client
function buildSeatData(rawSeats, allocations, paymentsByMember, gracePeriodDays) {
  const emptySlot = {
    occupied: false,
    member_id: null,
    member_name: null,
    fee_status: null,
    allocation_id: null,
  }

  return rawSeats.map((seat) => {
    const seatAllocs = allocations.filter((a) => a.seat_id === seat.id)

    function buildSlot(alloc) {
      if (!alloc) return emptySlot

      const lastPayment = paymentsByMember[alloc.member_id] || null
      const { status } = computeFeeStatus(lastPayment, gracePeriodDays)

      return {
        occupied: true,
        member_id: alloc.member_id,
        member_name: alloc.member_name,
        fee_status: status,
        allocation_id: alloc.id,
      }
    }

    const fulltimeAlloc = seatAllocs.find((a) => a.shift === 'fulltime')
    const morningAlloc  = seatAllocs.find((a) => a.shift === 'morning')
    const eveningAlloc  = seatAllocs.find((a) => a.shift === 'evening')

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
}

export default async function SeatsPage() {
  const supabase = await createClient()

  // Confirm session — redundant check after middleware but explicit is better
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  // Get partner's library_id and grace_period_days in one query
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('library_id, libraries(grace_period_days)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) {
    return <ErrorState message="Could not load library settings." />
  }

  const libraryId = partnerData.library_id
  const gracePeriodDays = partnerData.libraries?.grace_period_days ?? 10

  // Query 1 — all active seats ordered by seat number
  const { data: rawSeats, error: seatsError } = await supabase
    .from('seats')
    .select('id, seat_number, row_label')
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('seat_number', { ascending: true })

  if (seatsError) {
    console.error('[SeatsPage] seats query failed:', seatsError.message)
    return <ErrorState message="Could not load seat data. Please try again." />
  }

  // Query 2 — all active allocations with member names
  const { data: rawAllocations, error: allocError } = await supabase
    .from('seat_allocations')
    .select(`
      id,
      seat_id,
      member_id,
      shift,
      members ( id, name )
    `)
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (allocError) {
    console.error('[SeatsPage] allocations query failed:', allocError.message)
    return <ErrorState message="Could not load allocation data. Please try again." />
  }

  // Flatten allocation data
  const allocations = (rawAllocations || []).map((a) => ({
    id: a.id,
    seat_id: a.seat_id,
    member_id: a.member_id,
    shift: a.shift,
    member_name: a.members?.name || null,
  }))

  // Query 3 — latest fee payment for each member with an active allocation
  // Only run if there are any allocations to check
  const memberIds = [...new Set(allocations.map((a) => a.member_id).filter(Boolean))]
  let paymentsByMember = {}

  if (memberIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from('fee_payments')
      .select('member_id, period_end_date, period_start_date')
      .in('member_id', memberIds)
      .is('deleted_at', null)
      .order('period_end_date', { ascending: false })

    if (!paymentsError && payments) {
      // Keep only the most recent payment per member
      payments.forEach((p) => {
        if (!paymentsByMember[p.member_id]) {
          paymentsByMember[p.member_id] = p
        }
      })
    }
  }

  // Transform everything into the shape Zustand and SeatGrid expect
  const seats = buildSeatData(rawSeats || [], allocations, paymentsByMember, gracePeriodDays)

  return (
    <div className="pb-4">
      {/* Page header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {seats.filter((s) =>
                s.morning?.occupied && s.evening?.occupied
              ).length} of {seats.length} seats fully occupied
            </p>
          </div>
          {/* Seat count summary chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-green-50
                             text-green-700 rounded-full">
              {seats.filter((s) =>
                !s.morning?.occupied && !s.evening?.occupied
              ).length} free
            </span>
          </div>
        </div>
      </div>

      {/* Seat map — client component that hydrates Zustand */}
      <SeatMapClient initialSeats={seats} />
    </div>
  )
}