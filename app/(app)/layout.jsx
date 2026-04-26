// app/(app)/layout.jsx

import { redirect } from 'next/navigation'
import { ROUTES } from '@/utils/constants'
import { AppShell } from '@/components/layout/AppShell'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function AppLayout({ children }) {
  // getPartnerData() is cached — if a page also calls it,
  // only ONE database query runs total for this entire request
  const partner = await getPartnerData()

  // Partner record missing — auth account exists but no partner row
  // This should not happen in normal operation but must be handled
  if ( !partner ) {
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