// app/api/members/[id]/status/route.js

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES }   from '@/utils/constants'

function localDateString() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const istDate = new Date(new Date().getTime() + IST_OFFSET_MS)
  return [
    istDate.getUTCFullYear(),
    String(istDate.getUTCMonth() + 1).padStart(2, '0'),
    String(istDate.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

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

  const { status, reason } = body

  // Only two valid status transitions
  if (status !== 'inactive' && status !== 'active') {
    return NextResponse.json(
      {
        error:   ERROR_CODES.VALIDATION_ERROR,
        message: 'Status must be either inactive or active',
        field:   'status',
      },
      { status: 400 }
    )
  }

  try {
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('id, name, status, library_id')
      .eq('id', id)
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !member) {
      return NextResponse.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent no-op status changes
    if (member.status === status) {
      return NextResponse.json(
        {
          error:   ERROR_CODES.VALIDATION_ERROR,
          message: `Member is already ${status}`,
        },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    const today  = localDateString()

    // ── MARK INACTIVE ────────────────────────────────────────────────
    if (status === 'inactive') {
      const { data: updatedMember, error: updateError } = await supabase
        .from('members')
        .update({ status: 'inactive', updated_at: nowIso })
        .eq('id', id)
        .select('id, name, status')
        .single()

      if (updateError) throw updateError

      // End all active allocations — seat is freed immediately
      const { data: freedAllocations } = await supabase
        .from('seat_allocations')
        .update({ is_active: false, end_date: today, updated_at: nowIso })
        .eq('member_id', id)
        .eq('library_id', partner.library_id)
        .eq('is_active', true)
        .select('seat_id, shift')

      // Log status change
      await supabase.from('member_status_logs').insert({
        library_id:            partner.library_id,
        member_id:             id,
        old_status:            member.status,
        new_status:            'inactive',
        changed_by_partner_id: partner.id,
        reason:                reason || 'Marked inactive by partner',
      })

      await writeAuditLog(supabase, {
        library_id:  partner.library_id,
        partner_id:  partner.id,
        action:      'mark_member_inactive',
        entity_type: 'member',
        entity_id:   id,
        old_data:    { status: member.status },
        new_data:    { status: 'inactive', reason: reason || null },
      })

      return NextResponse.json({
        member:            updatedMember,
        freed_allocations: freedAllocations || [],
      })
    }

    // ── REACTIVATE ───────────────────────────────────────────────────
    if (status === 'active') {
      // Reactivation sets status back to active
      // No seat is auto-assigned — librarian uses "Assign new seat" after reactivation
      // The member keeps their full payment history and allocation history
      const { data: updatedMember, error: updateError } = await supabase
        .from('members')
        .update({ status: 'active', updated_at: nowIso })
        .eq('id', id)
        .select('id, name, status')
        .single()

      if (updateError) throw updateError

      // Log status change
      await supabase.from('member_status_logs').insert({
        library_id:            partner.library_id,
        member_id:             id,
        old_status:            member.status,
        new_status:            'active',
        changed_by_partner_id: partner.id,
        reason:                reason || 'Reactivated by partner',
      })

      await writeAuditLog(supabase, {
        library_id:  partner.library_id,
        partner_id:  partner.id,
        action:      'reactivate_member',
        entity_type: 'member',
        entity_id:   id,
        old_data:    { status: member.status },
        new_data:    { status: 'active' },
      })

      return NextResponse.json({ member: updatedMember })
    }

  } catch (error) {
    console.error('[PATCH /api/members/[id]/status]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update member status' },
      { status: 500 }
    )
  }
}