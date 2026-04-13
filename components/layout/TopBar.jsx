// components/layout/TopBar.jsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/utils/constants'

// Map route paths to their display titles
function getPageTitle(pathname) {
  if (pathname === ROUTES.DASHBOARD) return 'Dashboard'
  if (pathname === ROUTES.SEATS) return 'Seat Map'
  if (pathname === ROUTES.MEMBERS) return 'Members'
  if (pathname === ROUTES.MEMBER_NEW) return 'Add Member'
  if (pathname.startsWith('/members/') && pathname.endsWith('/pay')) return 'Record Payment'
  if (pathname.startsWith('/members/') && !pathname.includes('/pay')) return 'Member Profile'
  if (pathname === ROUTES.REPORTS) return 'Reports'
  if (pathname === ROUTES.SETTINGS) return 'Settings'
  if (pathname === ROUTES.SETTINGS_PARTNERS) return 'Partners'
  if (pathname === ROUTES.SETTINGS_SEATS) return 'Manage Seats'
  if (pathname === ROUTES.SETTINGS_FEES) return 'Fee Structure'
  return 'Library Manager'
}

export function TopBar({ libraryName }) {
  const pathname = usePathname()
  const router = useRouter()

  // Show a back button on deep pages (member profile, pay, settings sub-pages)
  const showBackButton = (
    (pathname.startsWith('/members/') && pathname !== ROUTES.MEMBERS && pathname !== ROUTES.MEMBER_NEW) ||
    pathname === ROUTES.SETTINGS_PARTNERS ||
    pathname === ROUTES.SETTINGS_SEATS ||
    pathname === ROUTES.SETTINGS_FEES
  )

  const pageTitle = getPageTitle(pathname)

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '56px',
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      gap: '0.75rem',
    }}>

      {/* Back button — visible on deep pages */}
      {showBackButton && (
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            color: '#374151',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Page title */}
      <h1 style={{
        flex: 1,
        fontSize: '1rem',
        fontWeight: '600',
        color: '#111111',
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {pageTitle}
      </h1>

      {/* Library name + Settings link */}
      <Link
        href={ROUTES.SETTINGS}
        title="Settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {libraryName}
        </span>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </Link>
    </header>
  )
}