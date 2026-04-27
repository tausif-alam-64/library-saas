// providers/AppProviders.jsx
'use client'

import { RealtimeProvider } from './RealtimeProvider'

export function AppProviders({ children }) {
  return (
    <RealtimeProvider>
        {children}
      </RealtimeProvider>
  )
}