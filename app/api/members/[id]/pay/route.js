// app/api/members/[id]/pay/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { validatePayment } from '@/lib/validators'
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

  const validationError = validatePayment(body)
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
    // Verify member belongs to this library and is not deleted
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, status, library_id')
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
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Cannot record payment for an inactive member',
        },
        { status: 400 }
      )
    }

    // Verify the collecting partner belongs to the same library
    const { data: collectingPartner, error: partnerCheckError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', body.collected_by_partner_id)
      .eq('library_id', partner.library_id)
      .eq('is_active', true)
      .single()

    if (partnerCheckError || !collectingPartner) {
      return NextResponse.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid collecting partner',
          field: 'collected_by_partner_id',
        },
        { status: 400 }
      )
    }

    // Prevent duplicate payment for same period
    const { data: existingPayment } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('member_id', id)
      .eq('library_id', partner.library_id)
      .eq('period_start_date', body.period_start_date)
      .eq('period_end_date', body.period_end_date)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        {
          error:   ERROR_CODES.VALIDATION_ERROR,
          message: 'A payment for this exact period has already been recorded. Check payment history before proceeding.',
          },
        { status: 400 }
      )
    }

    // Insert the payment record
    const { data: payment, error: insertError } = await supabase
      .from('fee_payments')
      .insert({
        library_id:               partner.library_id,
        member_id:                id,
        amount_paid:              body.amount_paid,
        is_prorated:              body.is_prorated || false,
        days_covered:             body.days_covered || null,
        period_start_date:        body.period_start_date,
        period_end_date:          body.period_end_date,
        paid_on:                  body.paid_on,
        collected_by_partner_id:  body.collected_by_partner_id,
        payment_mode:             body.payment_mode,
        notes:                    body.notes || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // If member was overdue but now has paid, update status to active
    if (member.status === 'overdue') {
      await supabase
        .from('members')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'record_payment',
      entity_type: 'fee_payment',
      entity_id:   payment.id,
      old_data:    null,
      new_data:    payment,
    })

    return NextResponse.json({ payment }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/members/[id]/pay]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to record payment' },
      { status: 500 }
    )
  }
}