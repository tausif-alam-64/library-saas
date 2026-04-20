// app/api/allocations/[id]/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES } from '@/utils/constants'

function localDateString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function PATCH(request, { params }) {
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

  // Use server-side local date as the authoritative value
  // The client may send a wrong date due to timezone issues
  // Server always wins for date-only values
  const endDate = localDateString()

  try {
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
        {
          error: ERROR_CODES.NOT_FOUND,
          message: 'Allocation not found or already ended',
        },
        { status: 404 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('seat_allocations')
      .update({
        is_active:   false,
        end_date:    endDate,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'end_allocation',
      entity_type: 'seat_allocation',
      entity_id:   id,
      old_data:    existing,
      new_data:    updated,
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