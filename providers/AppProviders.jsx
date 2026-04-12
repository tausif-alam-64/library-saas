// providers/AppProviders.jsx
'use client'

import { QueryProvider } from './QueryProvider'
import { RealtimeProvider } from './RealtimeProvider'

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <RealtimeProvider>
        {children}
      </RealtimeProvider>
    </QueryProvider>
  )
}