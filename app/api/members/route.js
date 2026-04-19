// app/api/members/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { validateMember } from '@/lib/validators'
import { ERROR_CODES } from '@/utils/constants'

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

  // Validate all required fields
  const validationError = validateMember(body)
  if (validationError) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: validationError.message,
        field: validationError.field,
      },
      { status: 400 }
    )
  }

  try {
    // Call the atomic RPC function created in Phase 2
    // This checks for seat conflicts and duplicate phones in one transaction
    // If anything fails, nothing is inserted — true atomicity
    const { data, error: rpcError } = await supabase.rpc(
      'create_member_with_allocation',
      {
        p_library_id:   partner.library_id,
        p_name:         body.name.trim(),
        p_phone:        body.phone.replace(/\D/g, ''),
        p_seat_id:      body.seat_id,
        p_shift:        body.shift,
        p_join_date:    body.join_date,
        p_created_by:   partner.id,
        p_address:      body.address || null,
        p_aadhar_last4: body.aadhar_last4 || null,
        p_photo_url:    body.photo_url || null,
        p_notes:        body.notes || null,
      }
    )

    if (rpcError) {
      // Parse the error message from our stored procedure
      if (rpcError.message.includes('SEAT_CONFLICT')) {
        return NextResponse.json(
          { error: ERROR_CODES.SEAT_CONFLICT, message: 'This seat and shift is already occupied' },
          { status: 409 }
        )
      }

      if (rpcError.message.includes('DUPLICATE_PHONE')) {
        return NextResponse.json(
          {
            error: ERROR_CODES.DUPLICATE_PHONE,
            message: 'A member with this phone number already exists',
            field: 'phone',
          },
          { status: 400 }
        )
      }

      throw rpcError
    }

    await writeAuditLog(supabase, {
      library_id:   partner.library_id,
      partner_id:   partner.id,
      action:       'create_member',
      entity_type:  'member',
      entity_id:    data.member.id,
      old_data:     null,
      new_data:     data.member,
    })

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('[POST /api/members]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to create member' },
      { status: 500 }
    )
  }
}