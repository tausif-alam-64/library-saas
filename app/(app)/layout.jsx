// app/(app)/layout.jsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/utils/constants'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }) {
  const supabase = await createClient()

  // Get the authenticated user
  // Middleware guarantees a session exists — but we verify again here
  // because middleware uses getSession() which can be stale.
  // getUser() makes a round-trip to Supabase Auth to confirm the token is valid.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch the partner record for this auth user
  // We join library data in the same query to avoid a second round-trip
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select(`
      id,
      name,
      role,
      library_id,
      is_active,
      libraries (
        id,
        name,
        address,
        phone,
        morning_cutoff_time,
        grace_period_days,
        no_show_days,
        plan,
        plan_expires_at
      )
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  // Partner record missing — auth account exists but no partner row
  // This should not happen in normal operation but must be handled
  if (partnerError || !partner) {
    console.error('[AppLayout] No partner record found for user:', user.id, partnerError?.message)
    redirect(ROUTES.LOGIN)
  }

  const library = partner.libraries

  if (!library) {
    console.error('[AppLayout] No library found for partner:', partner.id)
    redirect(ROUTES.LOGIN)
  }

  // Prepare clean objects to pass as props
  // We strip the nested libraries object from partner to keep it clean
  const partnerData = {
    id: partner.id,
    name: partner.name,
    role: partner.role,
    library_id: partner.library_id,
  }

  const libraryData = {
    id: library.id,
    name: library.name,
    address: library.address,
    phone: library.phone,
    morning_cutoff_time: library.morning_cutoff_time,
    grace_period_days: library.grace_period_days,
    no_show_days: library.no_show_days,
    plan: library.plan,
    plan_expires_at: library.plan_expires_at,
  }

  return (
    <AppShell partner={partnerData} library={libraryData}>
      {children}
    </AppShell>
  )
}