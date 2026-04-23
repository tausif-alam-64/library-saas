// components/layout/AppShell.jsx
'use client'

import { useLayoutEffect } from 'react'
import useAppStore from '@/stores/useAppStore'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

// AppShell receives partner and library from the server layout
// It hydrates the Zustand store synchronously (useLayoutEffect)
// so all child components can immediately read partner/library from Zustand
// without any prop drilling

export function AppShell({ partner, library, children }) {
  const setSession = useAppStore((state) => state.setSession)

   // Run on EVERY render — not just when id changes.
  // When grace_period_days, morning_cutoff_time, or no_show_days changes
  // via /settings, the server layout re-renders AppShell with new props.
  // Without running setSession again, Zustand holds stale values.
  // useLayoutEffect with no deps runs synchronously before every paint —
  // safe because setSession is a simple Zustand set() call.
  useLayoutEffect(() => {
    setSession(partner, library)
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#f9fafb',
    }}>
      {/* Offline indicator — sits above everything */}
      <OfflineBanner />

      {/* Top navigation bar */}
      <TopBar libraryName={library.name} />

      {/* Main content area */}
      {/* paddingBottom creates space so content is not hidden behind BottomNav */}
      <main style={{
        flex: 1,
        paddingTop: '56px',    // height of TopBar
        paddingBottom: '72px', // height of BottomNav + safe area
        overflowX: 'hidden',
      }}>
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Global UI overlays — rendered once here, triggered from anywhere via Zustand */}
      <Toast />
      <ConfirmDialog />
    </div>
  )
}