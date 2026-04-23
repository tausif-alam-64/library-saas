// app/api/settings/library/route.js

import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog }   from '@/lib/audit'
import { validateLibrarySettings } from '@/lib/validators'
import { ERROR_CODES }     from '@/utils/constants'

export async function PATCH(request) {
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

  const validationError = validateLibrarySettings(body)
  if (validationError) {
    return NextResponse.json(
      {
        error:   ERROR_CODES.VALIDATION_ERROR,
        message: validationError.message,
        field:   validationError.field,
      },
      { status: 400 }
    )
  }

  // Whitelist of updatable fields — never allow arbitrary columns
  const allowed = ['name', 'address', 'phone', 'morning_cutoff_time', 'grace_period_days', 'no_show_days']
  const updates = {}
  allowed.forEach((field) => {
    if (body[field] !== undefined) updates[field] = body[field]
  })
  updates.updated_at = new Date().toISOString()

  try {
    // Fetch current for audit log
    const { data: existing } = await supabase
      .from('libraries')
      .select('*')
      .eq('id', partner.library_id)
      .single()

    const { data: updated, error: updateError } = await supabase
      .from('libraries')
      .update(updates)
      .eq('id', partner.library_id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'update_library_settings',
      entity_type: 'library',
      entity_id:   partner.library_id,
      old_data:    existing,
      new_data:    updated,
    })

    return NextResponse.json({ library: updated })

  } catch (error) {
    console.error('[PATCH /api/settings/library]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update library settings' },
      { status: 500 }
    )
  }
}