// app/api/members/[id]/status/route.js

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

  const { status, reason } = body

  // Currently only 'inactive' is a valid status change through this endpoint
  // Reactivation requires admin action through the database directly
  if (status !== 'inactive') {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Only inactive is a valid status change', field: 'status' },
      { status: 400 }
    )
  }

  try {
    // Fetch current member state
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('id, name, status, library_id')
      .eq('id', params.id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !member) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
        { status: 404 }
      )
    }

    if (member.status === 'inactive') {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Member is already inactive' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // Step 1 — update member status
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({ status: 'inactive', updated_at: now })
      .eq('id', params.id)
      .select('id, name, status')
      .single()

    if (updateError) throw updateError

    // Step 2 — end all active allocations and capture which seat was freed
    const { data: freedAllocations } = await supabase
      .from('seat_allocations')
      .update({ is_active: false, end_date: today, updated_at: now })
      .eq('member_id', params.id)
      .eq('library_id', partner.library_id)
      .eq('is_active', true)
      .select('seat_id, shift')

    // Step 3 — write to member_status_logs for complete audit trail
    await supabase.from('member_status_logs').insert({
      library_id: partner.library_id,
      member_id: params.id,
      old_status: member.status,
      new_status: 'inactive',
      changed_by_partner_id: partner.id,
      reason: reason || '7 days no show',
    })

    // Step 4 — audit log
    await writeAuditLog(supabase, {
      library_id: partner.library_id,
      partner_id: partner.id,
      action: 'mark_member_inactive',
      entity_type: 'member',
      entity_id: params.id,
      old_data: { status: member.status },
      new_data: { status: 'inactive', reason: reason || null },
    })

    return NextResponse.json({
      member: updatedMember,
      freed_allocations: freedAllocations || [],
    })

  } catch (error) {
    console.error('[PATCH /api/members/[id]/status]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update member status' },
      { status: 500 }
    )
  }
}