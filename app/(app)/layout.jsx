// app/(app)/layout.jsx

import { redirect } from 'next/navigation'
import { ROUTES } from '@/utils/constants'
import { AppShell } from '@/components/layout/AppShell'
import { getPartnerData } from '@/lib/getPartnerData'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { Suspense } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Separate async server component so it can sit behind a Suspense boundary.
// The layout itself renders synchronously — this component is what awaits data.
// When this is inside <Suspense>, Next.js streams the outer layout shell
// immediately and fills this in when the data arrives.
export async function AppShellLoader({ children }) {
  // getPartnerData() is cached — if a page also calls it,
  // only ONE database query runs total for this entire request
  let partnerData
  try {
    partnerData = await getPartnerData()
  } catch (err) {
    console.error('[AppLayout] getPartnerData threw:', err)
    partnerData = null
  }

  // Partner record missing — auth account exists but no partner row
  // This should not happen in normal operation but must be handled
  if ( !partnerData ) {
    console.error('[AppLayout] No partner record found ')
    redirect(ROUTES.LOGIN)
  }

  const library = partnerData.libraries

  if (!library) {
    console.error('[AppLayout] No library found for partner:', partnerData.id)
    redirect(ROUTES.LOGIN)
  }

  // Prepare clean objects to pass as props
  // We strip the nested libraries object from partner to keep it clean
  const partnerInfo = {
    id: partnerData.id,
    name: partnerData.name,
    role: partnerData.role,
    library_id: partnerData.library_id,
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
    <AppShell partner={partnerInfo} library={libraryData}>
      {children}
    </AppShell>
  )
}

// Shown while AppShellLoader is awaiting getPartnerData().
// Matches TopBar height exactly (h-14 = 56px) so no layout shift
// when real TopBar replaces this.
function TopBarFallback() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-14
                 bg-white border-b border-gray-100
                 flex items-center justify-between px-4"
    >
      <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
    </div>
  )
}

export default function AppLayout({ children }) {
  // This function is SYNCHRONOUS — no await here.
  // React renders this immediately and streams it to the browser.
  // The Suspense boundary handles the async data loading separately.
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Renders immediately — no data dependency */}
      <OfflineBanner />

      {/* Suspense boundary:
          - Fallback (TopBarFallback) renders instantly
          - AppShellLoader fetches partner/library data
          - When data arrives, AppShell replaces the fallback
          - children (the page) stream in when their own data is ready */}
      <Suspense fallback={<TopBarFallback />}>
        <AppShellLoader>
          {children}
        </AppShellLoader>
      </Suspense>

      {/* These render immediately — no data dependency.
          BottomNav uses usePathname (client-side, no DB).
          Toast and ConfirmDialog read from Zustand (client-side).
          They will be visible before AppShell finishes loading. */}
      <BottomNav />
      <Toast />
      <ConfirmDialog />
    </div>
  )
}