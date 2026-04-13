// app/not-found.jsx

import Link from 'next/link'
import { ROUTES } from '@/utils/constants'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#f9fafb',
    }}>
      <p style={{
        fontSize: '4rem',
        fontWeight: '700',
        color: '#e5e7eb',
        marginBottom: '0.5rem',
        lineHeight: 1,
      }}>
        404
      </p>
      <h1 style={{
        fontSize: '1.125rem',
        fontWeight: '500',
        color: '#111111',
        marginBottom: '0.5rem',
      }}>
        Page not found
      </h1>
      <p style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '2rem',
        textAlign: 'center',
      }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href={ROUTES.DASHBOARD}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '44px',
          padding: '0 1.5rem',
          background: '#111111',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '500',
          textDecoration: 'none',
        }}
      >
        Go to dashboard
      </Link>
    </div>
  )
}