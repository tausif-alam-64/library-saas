// app/api/seats/[id]/route.js

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES }   from '@/utils/constants'

export async function PATCH(request, { params }) {
  const { id }   = await params
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

  try {
    const { data: seat, error: fetchError } = await supabase
      .from('seats')
      .select('id, seat_number, is_active, row_label')
      .eq('id', id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !seat) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Seat not found' },
        { status: 404 }
      )
    }

    // Cannot deactivate a seat that has an active allocation
    if (body.is_active === false) {
      const { data: activeAlloc } = await supabase
        .from('seat_allocations')
        .select('id, shift, members(name)')
        .eq('seat_id', id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (activeAlloc) {
        const memberName = activeAlloc.members?.name || 'a member'
        return NextResponse.json(
          {
            error: ERROR_CODES.VALIDATION_ERROR,
            message: `Cannot deactivate seat ${seat.seat_number} — ${memberName} is currently assigned here. Free the seat first.`,
          },
          { status: 400 }
        )
      }
    }

    const allowed = ['is_active', 'row_label']
    const updates = {}
    allowed.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f] })
    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('seats')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'update_seat',
      entity_type: 'seat',
      entity_id:   id,
      old_data:    seat,
      new_data:    updated,
    })

    return NextResponse.json({ seat: updated })

  } catch (error) {
    console.error('[PATCH /api/seats/[id]]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update seat' },
      { status: 500 }
    )
  }
}