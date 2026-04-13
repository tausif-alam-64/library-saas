// app/error.jsx
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Sentry captures this automatically via the SDK
    // but we log it here as a fallback
    console.error('[GlobalError]', error)
    Sentry.captureException(error)
  }, [error])

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
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#fef2f2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 style={{
        fontSize: '1.125rem',
        fontWeight: '500',
        color: '#111111',
        marginBottom: '0.5rem',
      }}>
        Something went wrong
      </h1>
      <p style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '280px',
      }}>
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          height: '44px',
          padding: '0 1.5rem',
          background: '#111111',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        Try again
      </button>
    </div>
  )
}