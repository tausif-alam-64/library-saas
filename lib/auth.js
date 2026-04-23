// lib/auth.js

// Get the currently authenticated partner from the session
// Returns { partner, error }
// partner contains: id, name, role, library_id
//
// Call this at the start of every API route before any business logic
export async function getPartner(supabase) {
  try {
    // Get the authenticated user from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { partner: null, error: 'No authenticated session' }
    }

    // Look up the partner record linked to this auth user
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, role, library_id, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (partnerError || !partner) {
      return { partner: null, error: 'Partner account not found or inactive' }
    }

    // Verify the library exists and is not deleted
    // Prevents cryptic errors if library data is somehow corrupted
    const { data: library, error: libraryError } = await supabase
      .from('libraries')
      .select('id, plan')
      .eq('id', partner.library_id)
      .is('deleted_at', null)
      .single()

    if (libraryError || !library) {
      return { partner: null, error: 'Library not found or has been deactivated' }
    }

    return { partner, error: null }
  } catch (err) {
    console.error('[auth] getPartner unexpected error:', err)
    return { partner: null, error: 'Authentication error' }
  }
}

// Check that the current partner has the primary role
// Returns { error: null } if allowed, { error: string } if not
//
// Usage in API routes:
//   const { error: roleError } = requirePrimary(partner)
//   if (roleError) return NextResponse.json({ error: 'FORBIDDEN', message: roleError }, { status: 403 })
export function requirePrimary(partner) {
  if (!partner) {
    return { error: 'Partner is required' }
  }
  if (partner.role !== 'primary') {
    return { error: 'Only the primary partner can perform this action' }
  }
  return { error: null }
}