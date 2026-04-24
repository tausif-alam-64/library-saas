// app/api/seats/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { ERROR_CODES } from '@/utils/constants'
import { writeAuditLog } from '@/lib/audit'

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

export async function POST(request) {
  const supabase = await createClient()

  const { partner, error: authError } = await getPartner(supabase)
  if (authError) {
    return NextResponse.json(
      { error: ERROR_CODES.NOT_AUTHENTICATED, message: 'Please log in' },
      { status: 401 }
    )
  }

  const { error: roleError } = requirePrimary(partner)
  if (roleError) {
    return NextResponse.json(
      { error: ERROR_CODES.FORBIDDEN, message: roleError },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { from_number, to_number, row_label } = body

  if (!from_number || !to_number) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'from_number and to_number are required' },
      { status: 400 }
    )
  }

  const from = parseInt(from_number)
  const to   = parseInt(to_number)

  if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid seat number range' },
      { status: 400 }
    )
  }

  if (to - from > 99) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Cannot add more than 100 seats at once' },
      { status: 400 }
    )
  }

  try {
    // Check for conflicts with existing seat numbers
    const numbersToAdd = Array.from({ length: to - from + 1 }, (_, i) => from + i)

    const { data: existing } = await supabase
      .from('seats')
      .select('seat_number')
      .eq('library_id', partner.library_id)
      .in('seat_number', numbersToAdd)
      .is('deleted_at', null)

    if (existing && existing.length > 0) {
      const conflicts = existing.map((s) => s.seat_number).join(', ')
      return NextResponse.json(
        {
          error:   ERROR_CODES.VALIDATION_ERROR,
          message: `Seat numbers already exist: ${conflicts}`,
        },
        { status: 400 }
      )
    }

    // Insert all new seats
    const seatsToInsert = numbersToAdd.map((num) => ({
      library_id:  partner.library_id,
      seat_number: num,
      row_label:   row_label?.trim() || null,
      is_active:   true,
    }))

    const { data: newSeats, error: insertError } = await supabase
      .from('seats')
      .insert(seatsToInsert)
      .select()

    if (insertError) throw insertError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'add_seats',
      entity_type: 'seat',
      entity_id:   null,
      new_data:    { from_number: from, to_number: to, count: newSeats.length },
    })

    return NextResponse.json(
      { added: newSeats.length, seats: newSeats },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/seats]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to add seats' },
      { status: 500 }
    )
  }
}