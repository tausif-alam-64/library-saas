// app/api/members/[id]/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES } from '@/utils/constants'

export async function PATCH(request, { params }) {
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

  // Validate phone if provided
  if (body.phone !== undefined) {
    const digits = body.phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Phone must be 10 digits', field: 'phone' },
        { status: 400 }
      )
    }
  }

  // Validate name if provided
  if (body.name !== undefined && body.name.trim().length < 2) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Name must be at least 2 characters', field: 'name' },
      { status: 400 }
    )
  }

  try {
    // Fetch current state for audit log
    const { data: existing, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', params.id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
        { status: 404 }
      )
    }

    // Only allow updating these specific fields
    const allowedFields = ['name', 'phone', 'address', 'notes']
    const updates = {}
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field]
    })
    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('members')
      .update(updates)
      .eq('id', params.id)
      .eq('library_id', partner.library_id)
      .select()
      .single()

    if (updateError) throw updateError

    await writeAuditLog(supabase, {
      library_id: partner.library_id,
      partner_id: partner.id,
      action: 'update_member',
      entity_type: 'member',
      entity_id: params.id,
      old_data: existing,
      new_data: updated,
    })

    return NextResponse.json({ member: updated })

  } catch (error) {
    console.error('[PATCH /api/members/[id]]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update member' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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

  try {
    // Fetch current state for audit and soft-delete
    const { data: existing, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', params.id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Soft delete the member
    await supabase
      .from('members')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', params.id)

    // End all active allocations
    await supabase
      .from('seat_allocations')
      .update({
        is_active: false,
        end_date: now.split('T')[0],
        updated_at: now,
      })
      .eq('member_id', params.id)
      .eq('library_id', partner.library_id)
      .eq('is_active', true)

    await writeAuditLog(supabase, {
      library_id: partner.library_id,
      partner_id: partner.id,
      action: 'delete_member',
      entity_type: 'member',
      entity_id: params.id,
      old_data: existing,
      new_data: { deleted_at: now },
    })

    return NextResponse.json({ message: 'Member deleted successfully' })

  } catch (error) {
    console.error('[DELETE /api/members/[id]]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to delete member' },
      { status: 500 }
    )
  }
}