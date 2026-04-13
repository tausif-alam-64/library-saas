// components/layout/BottomNav.jsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/utils/constants'

const NAV_ITEMS = [
  {
    href: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
      </svg>
    ),
    // Active when on dashboard exactly
    isActive: (pathname) => pathname === ROUTES.DASHBOARD,
  },
  {
    href: ROUTES.SEATS,
    label: 'Seats',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M2 11a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3z"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
        <path d="M6 16v3M18 16v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    isActive: (pathname) => pathname.startsWith(ROUTES.SEATS),
  },
  {
    href: ROUTES.MEMBERS,
    label: 'Members',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4"
          stroke="currentColor" strokeWidth="2"
          fill={active ? 'currentColor' : 'none'}/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    isActive: (pathname) => pathname.startsWith(ROUTES.MEMBERS),
  },
  {
    href: ROUTES.REPORTS,
    label: 'Reports',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    isActive: (pathname) => pathname.startsWith(ROUTES.REPORTS),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '64px',
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'stretch',
        // Account for iOS safe area (home bar)
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: active ? '#111111' : '#9ca3af',
              transition: 'color 0.15s',
              // Ensure minimum tap target
              minHeight: '44px',
            }}
          >
            {item.icon(active)}
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: active ? '600' : '400',
              lineHeight: 1,
            }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}