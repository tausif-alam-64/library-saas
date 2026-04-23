// components/layout/AppShell.jsx
'use client'

import { useLayoutEffect } from 'react'
import useAppStore from '@/stores/useAppStore'
import { TopBar }        from './TopBar'
import { BottomNav }     from './BottomNav'
import { Toast }         from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export function AppShell({ partner, library, children }) {
  const setSession = useAppStore((state) => state.setSession)

  // Track every field that downstream components read from the store.
  // When any of these change (e.g. grace_period_days updated via settings),
  // the store is refreshed with the latest server-provided values.
  // Using JSON.stringify as a stable single dependency prevents excessive calls
  // while ensuring all nested field changes are detected.
  const partnerKey = JSON.stringify({ id: partner.id, role: partner.role })
  const libraryKey = JSON.stringify({
    id:                  library.id,
    grace_period_days:   library.grace_period_days,
    no_show_days:        library.no_show_days,
    morning_cutoff_time: library.morning_cutoff_time,
    plan:                library.plan,
  })

  useLayoutEffect(() => {
    setSession(partner, library)
  }, [partnerKey, libraryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <OfflineBanner />
      <TopBar libraryName={library.name} />
      <main style={{
        flex:          1,
        paddingTop:    '56px',
        paddingBottom: '72px',
        overflowX:     'hidden',
      }}>
        {children}
      </main>
      <BottomNav />
      <Toast />
      <ConfirmDialog />
    </div>
  )
}