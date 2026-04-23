// app/api/partners/[id]/route.js

import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog }     from '@/lib/audit'
import { ERROR_CODES }       from '@/utils/constants'

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

  // Cannot modify a partner from a different library
  const { data: targetPartner, error: fetchError } = await supabase
    .from('partners')
    .select('id, name, role, is_active, auth_user_id')
    .eq('id', id)
    .eq('library_id', partner.library_id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !targetPartner) {
    return NextResponse.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Partner not found' },
      { status: 404 }
    )
  }

  // Cannot deactivate yourself
  if (body.is_active === false && id === partner.id) {
    return NextResponse.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'You cannot deactivate your own account' },
      { status: 403 }
    )
  }

  // Cannot change your own role (prevents accidentally locking yourself out)
  if (body.role !== undefined && id === partner.id) {
    return NextResponse.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'You cannot change your own role' },
      { status: 403 }
    )
  }

  // If deactivating a primary, ensure at least one other primary remains
  if (body.is_active === false && targetPartner.role === 'primary') {
    const { data: otherPrimaries } = await supabase
      .from('partners')
      .select('id')
      .eq('library_id', partner.library_id)
      .eq('role', 'primary')
      .eq('is_active', true)
      .neq('id', id)
      .is('deleted_at', null)

    if (!otherPrimaries || otherPrimaries.length === 0) {
      return NextResponse.json(
        {
          error:   ERROR_CODES.FORBIDDEN,
          message: 'Cannot deactivate the only primary partner. Assign another primary first.',
        },
        { status: 403 }
      )
    }
  }

  // If changing role from primary to viewer, ensure at least one primary remains
  if (body.role === 'viewer' && targetPartner.role === 'primary') {
    const { data: otherPrimaries } = await supabase
      .from('partners')
      .select('id')
      .eq('library_id', partner.library_id)
      .eq('role', 'primary')
      .eq('is_active', true)
      .neq('id', id)
      .is('deleted_at', null)

    if (!otherPrimaries || otherPrimaries.length === 0) {
      return NextResponse.json(
        {
          error:   ERROR_CODES.FORBIDDEN,
          message: 'Cannot change the only primary partner to viewer. Assign another primary first.',
        },
        { status: 403 }
      )
    }
  }

  try {
    const allowed = ['name', 'phone', 'role', 'is_active']
    const updates = {}
    allowed.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field]
    })
    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'update_partner',
      entity_type: 'partner',
      entity_id:   id,
      old_data:    targetPartner,
      new_data:    updated,
    })

    return NextResponse.json({ partner: updated })

  } catch (error) {
    console.error('[PATCH /api/partners/[id]]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update partner' },
      { status: 500 }
    )
  }
}