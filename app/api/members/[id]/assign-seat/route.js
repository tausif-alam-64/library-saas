// app/api/members/[id]/assign-seat/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES } from '@/utils/constants'

export async function POST(request, { params }) {
  const { id } = await params
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

  const { seat_id, shift, start_date } = body

  if (!seat_id || !shift || !start_date) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'seat_id, shift, and start_date are required' },
      { status: 400 }
    )
  }

  if (!['morning', 'evening', 'fulltime'].includes(shift)) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid shift value', field: 'shift' },
      { status: 400 }
    )
  }

  try {
    // Verify member exists and belongs to this library
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, status')
      .eq('id', id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
        { status: 404 }
      )
    }

    if (member.status === 'inactive') {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Cannot assign seat to inactive member' },
        { status: 400 }
      )
    }

    // Check member has no active allocation already
    const { data: existingAlloc } = await supabase
      .from('seat_allocations')
      .select('id')
      .eq('member_id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingAlloc) {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Member already has an active seat allocation' },
        { status: 400 }
      )
    }

    // Check seat conflict
    const { data: conflict } = await supabase
      .from('seat_allocations')
      .select('id')
      .eq('seat_id', seat_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(
        shift === 'fulltime'
          ? 'shift.eq.morning,shift.eq.evening,shift.eq.fulltime'
          : `shift.eq.${shift},shift.eq.fulltime`
      )
      .maybeSingle()

    if (conflict) {
      return NextResponse.json(
        { error: ERROR_CODES.SEAT_CONFLICT, message: 'This seat and shift is already occupied' },
        { status: 409 }
      )
    }

    // Create the allocation
    const { data: allocation, error: insertError } = await supabase
      .from('seat_allocations')
      .insert({
        library_id:            partner.library_id,
        seat_id,
        member_id:             id,
        shift,
        start_date,
        is_active:             true,
        created_by_partner_id: partner.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'assign_seat',
      entity_type: 'seat_allocation',
      entity_id:   allocation.id,
      old_data:    null,
      new_data:    allocation,
    })

    return NextResponse.json({ allocation }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/members/[id]/assign-seat]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to assign seat' },
      { status: 500 }
    )
  }
}