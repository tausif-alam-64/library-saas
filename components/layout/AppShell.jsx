// components/layout/AppShell.jsx
'use client'

import { useLayoutEffect } from 'react'
import useAppStore from '@/stores/useAppStore'
import { TopBar } from './TopBar'

// AppShell now only handles what NEEDS data:
// - hydrating Zustand with partner/library
// - rendering TopBar (needs library.name)
// - rendering the main content area
// BottomNav, Toast, ConfirmDialog, OfflineBanner moved to layout
// because they have zero data dependency

export function AppShell({ partner, library, children }) {
  const setSession = useAppStore((state) => state.setSession)

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
    <>
      <TopBar libraryName={library.name} />
      <main
        style={{
          flex:          1,
          paddingTop:    '56px',
          paddingBottom: '72px',
          overflowX:     'hidden',
        }}
      >
        {children}
      </main>
    </>
  )
}