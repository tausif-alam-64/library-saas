// app/api/partners/route.js

import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { getPartner, requirePrimary } from '@/lib/auth'
import { writeAuditLog }     from '@/lib/audit'
import { validatePartner }   from '@/lib/validators'
import { ERROR_CODES }       from '@/utils/constants'

export async function GET(request) {
  const supabase = await createClient()

  const { partner, error: authError } = await getPartner(supabase)
  if (authError) {
    return NextResponse.json(
      { error: ERROR_CODES.NOT_AUTHENTICATED, message: 'Please log in' },
      { status: 401 }
    )
  }

  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, name, phone, role, is_active, created_at, auth_user_id')
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)
      .order('role', { ascending: false }) // primary first
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ partners: partners || [] })

  } catch (error) {
    console.error('[GET /api/partners]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const supabase      = await createClient()
  const supabaseAdmin = createAdminClient()

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

  const validationError = validatePartner(body)
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

  try {
    // Check if email already exists in this library
    const { data: existingPartners } = await supabase
      .from('partners')
      .select('id')
      .eq('library_id', partner.library_id)
      .is('deleted_at', null)

    // Max 5 partners per library (practical limit)
    if ((existingPartners || []).length >= 5) {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Maximum 5 partners allowed per library' },
        { status: 400 }
      )
    }

    // Create the Supabase Auth user using the admin client
    // This bypasses the public signup flow which we disabled
    const { data: authUser, error: authCreateError } = await supabaseAdmin
      .auth.admin.createUser({
        email:             body.email.trim().toLowerCase(),
        password:          body.temporary_password,
        email_confirm:     true, // Bypass email confirmation
      })

    if (authCreateError) {
      // Email already registered in Supabase Auth
      if (authCreateError.message.includes('already registered') ||
          authCreateError.message.includes('already been registered') ||
          authCreateError.status === 422) {
        return NextResponse.json(
          {
            error:   ERROR_CODES.VALIDATION_ERROR,
            message: 'This email address is already registered',
            field:   'email',
          },
          { status: 400 }
        )
      }
      throw authCreateError
    }

    // Create the partner record linked to the new auth user
    const { data: newPartner, error: insertError } = await supabase
      .from('partners')
      .insert({
        library_id:   partner.library_id,
        auth_user_id: authUser.user.id,
        name:         body.name.trim(),
        phone:        body.phone?.trim() || null,
        role:         body.role,
        is_active:    true,
      })
      .select()
      .single()

    if (insertError) {
      // Roll back auth user creation if partner insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw insertError
    }

    await writeAuditLog(supabase, {
      library_id:  partner.library_id,
      partner_id:  partner.id,
      action:      'create_partner',
      entity_type: 'partner',
      entity_id:   newPartner.id,
      new_data:    { name: newPartner.name, role: newPartner.role },
    })

    return NextResponse.json({ partner: newPartner }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/partners]', error)
    return NextResponse.json(
      { error: ERROR_CODES.SERVER_ERROR, message: 'Failed to create partner' },
      { status: 500 }
    )
  }
}