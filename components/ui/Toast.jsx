// components/ui/Toast.jsx
'use client'

import { useEffect } from 'react'
import useUIStore from '@/stores/useUIStore'

function ToastItem({ toast }) {
  const removeToast = useUIStore((state) => state.removeToast)

  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '#16a34a' },
    error:   { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: '#dc2626' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: '#2563eb' },
  }

  const c = colors[toast.type] || colors.success

  const icons = {
    success: (
      <path d="M20 6L9 17l-5-5" stroke={c.icon} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    ),
    error: (
      <path d="M18 6L6 18M6 6l12 12" stroke={c.icon} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" stroke={c.icon} strokeWidth="2"/>
        <path d="M12 16v-4M12 8h.01" stroke={c.icon} strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        animation: 'toastIn 0.2s ease',
      }}
    >
      {/* Icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        style={{ flexShrink: 0, marginTop: '1px' }}>
        {icons[toast.type] || icons.success}
      </svg>

      {/* Message */}
      <p style={{
        flex: 1,
        margin: 0,
        fontSize: '0.875rem',
        fontWeight: '500',
        color: c.text,
        lineHeight: '1.4',
      }}>
        {toast.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.text,
          opacity: 0.6,
          minHeight: 'auto',
          minWidth: 'auto',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export function Toast() {
  const toasts = useUIStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        // Below TopBar, above everything else
        top: '64px',
        left: '1rem',
        right: '1rem',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} />
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}