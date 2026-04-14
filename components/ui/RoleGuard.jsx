// components/ui/RoleGuard.jsx
'use client'

import useAppStore from '@/stores/useAppStore'

// Wraps any content that should only be visible to primary partners
// Viewer partners see nothing — no error, no message, just empty
// Usage: <RoleGuard><button>Assign Seat</button></RoleGuard>
export function RoleGuard({ children, fallback = null }) {
  const partner = useAppStore((state) => state.partner)

  if (!partner || partner.role !== 'primary') {
    return fallback
  }

  return children
}