// components/ui/LoadingSpinner.jsx

export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        gap: '0.75rem',
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'spin 0.8s linear infinite' }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0110 10" stroke="#111111" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <span style={{
        fontSize: '0.875rem',
        color: '#9ca3af',
      }}>
        {label}
      </span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}