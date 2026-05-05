// app/api/fee-structures/route.js

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ERROR_CODES }   from '@/utils/constants'

function localDateString() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const ist = new Date(new Date().getTime() + IST_OFFSET_MS)
  return [
    ist.getUTCFullYear(),
    String(ist.getUTCMonth() + 1).padStart(2, '0'),
    String(ist.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Add one day to a date string (for valid_until = new_valid_from - 1)
function dateMinus1Day(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return localDateStr(date)
}

export async function GET() {
  const supabase = await createClient()

  const { partner, error: authError } = await getPartner(supabase)
  if (authError) {
    return NextResponse.json(
      { error: ERROR_CODES.NOT_AUTHENTICATED, message: 'Please log in' },
      { status: 401 }
    )
  }

  try {
    const { data: structures, error } = await supabase
      .from('fee_structures')
      .select('id, morning_fee, evening_fee, fulltime_fee, valid_from, valid_until, created_at')
      .eq('library_id', partner.library_id)
      .order('valid_from', { ascending: false })

    if (error) throw error

    const current = (structures || []).find((s) => s.valid_until === null)
    const history = (structures || []).filter((s) => s.valid_until !== null)

    return NextResponse.json({ current: current || null, history })

  } catch (error) {
    console.error('[GET /api/fee-structures]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to fetch fee structures' },
      { status: 500 }
    )
  }
}

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

  const { morning_fee, evening_fee, fulltime_fee, valid_from } = body

  // Validate fee amounts
  if (!morning_fee || !evening_fee || !fulltime_fee) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'All three fee amounts are required' },
      { status: 400 }
    )
  }

  const fees = [morning_fee, evening_fee, fulltime_fee].map(Number)
  if (fees.some((f) => isNaN(f) || f <= 0)) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Fee amounts must be positive numbers' },
      { status: 400 }
    )
  }

  if (!valid_from) {
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Effective date is required', field: 'valid_from' },
      { status: 400 }
    )
  }

  // Effective date cannot be in the past — only today or future
  const todayStr = localDateString()
  if (valid_from < todayStr) {
    return NextResponse.json(
      {
        error:   ERROR_CODES.VALIDATION_ERROR,
        message: 'Effective date cannot be in the past. Use today or a future date.',
        field:   'valid_from',
      },
      { status: 400 }
    )
  }

  try {
    // Find current active fee structure
    const { data: currentFee } = await supabase
      .from('fee_structures')
      .select('id, valid_from')
      .eq('library_id', partner.library_id)
      .is('valid_until', null)
      .maybeSingle()

    // Cannot have two fee structures with the same valid_from
    if (currentFee && currentFee.valid_from === valid_from) {
      return NextResponse.json(
        {
          error:   ERROR_CODES.VALIDATION_ERROR,
          message: 'A fee structure with this effective date already exists',
          field:   'valid_from',
        },
        { status: 400 }
      )
    }

    // Step 1: Close the current fee structure first
  if (currentFee) {
    const valid_until = dateMinus1Day(valid_from)

    const { error: closeError } = await supabase
      .from('fee_structures')
      .update({ valid_until })
      .eq('id', currentFee.id)

    // If we cannot close the old record, abort entirely
    // Never proceed to insert — would create two active fee structures
    if (closeError) {
      console.error('[POST /api/fee-structures] Failed to close old fee structure:', closeError)
      return NextResponse.json(
        { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update fee structure. Please try again.' },
        { status: 500 }
      )
    }
  }

  // Step 2: Insert new fee structure (only runs if step 1 succeeded)
  const { data: newFee, error: insertError } = await supabase
    .from('fee_structures')
    .insert({
      library_id:            partner.library_id,
      morning_fee:           Number(morning_fee),
      evening_fee:           Number(evening_fee),
      fulltime_fee:          Number(fulltime_fee),
      valid_from,
      valid_until:           null,
      created_by_partner_id: partner.id,
    })
    .select()
    .single()

  if (insertError) {
    // If insert fails, try to re-open the old record
    // (best-effort rollback — not a full transaction but better than nothing)
    if (currentFee) {
      await supabase
        .from('fee_structures')
        .update({ valid_until: null })
        .eq('id', currentFee.id)
    }
    throw insertError
  }

  await writeAuditLog(supabase, {
    library_id:  partner.library_id,
    partner_id:  partner.id,
    action:      'update_fee_structure',
    entity_type: 'fee_structure',
    entity_id:   newFee.id,
    old_data:    currentFee || null,
    new_data:    newFee,
  })

    return NextResponse.json({ fee_structure: newFee }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/fee-structures]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to update fee structure' },
      { status: 500 }
    )
  }
}