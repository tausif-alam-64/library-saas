// app/api/seats/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner } from '@/lib/auth'
import { ERROR_CODES } from '@/utils/constants'

export async function GET() {
  const supabase = await createClient()

  const { partner, error: authError } = await getPartner(supabase)
  if (authError) {
    return NextResponse.json(
      { error: ERROR_CODES.NOT_AUTHENTICATED, message: 'Please log in' },
      { status: 401 }
    )
  }

  try {
    const { data: rawSeats, error: seatsError } = await supabase
      .from('seats')
      .select(`
        id, seat_number, row_label,
        seat_allocations(
          id, shift, member_id, is_active,
          members(name)
        )
      `)
      .eq('library_id', partner.library_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('seat_number', { ascending: true })

    if (seatsError) throw seatsError

    // Transform into the shape SeatPickerStep expects
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

    return NextResponse.json({ seats })

  } catch (error) {
    console.error('[GET /api/seats]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to fetch seats' },
      { status: 500 }
    )
  }
}