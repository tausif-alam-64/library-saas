// app/api/allocations/[id]/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES } from '@/utils/constants'

export async function PATCH(request, { params }) {

  const {id} = await params
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

  const { end_date } = body
  if (!end_date) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'end_date is required', field: 'end_date' },
      { status: 400 }
    )
  }

  try {
    // Verify this allocation belongs to the partner's library
    const { data: existing, error: fetchError } = await supabase
      .from('seat_allocations')
      .select('id, seat_id, member_id, shift, library_id')
      .eq('id', id)
      .eq('library_id', partner.library_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Allocation not found or already ended' },
        { status: 404 }
      )
    }

    // End the allocation
    const { data: updated, error: updateError } = await supabase
      .from('seat_allocations')
      .update({
        is_active: false,
        end_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id: partner.library_id,
      partner_id: partner.id,
      action: 'end_allocation',
      entity_type: 'seat_allocation',
      entity_id: id,
      old_data: existing,
      new_data: updated,
    })

    return NextResponse.json({ allocation: updated })

  } catch (error) {
    console.error('[PATCH /api/allocations/[id]]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to end allocation' },
      { status: 500 }
    )
  }
}