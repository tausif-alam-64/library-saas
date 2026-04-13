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

  // useLayoutEffect runs synchronously before the browser paints
  // This guarantees Zustand is populated before any child renders
  useLayoutEffect(() => {
    setSession(partner, library)
  }, [partner.id, library.id])

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