// components/ui/EmptyState.jsx

// message   — main line: "No overdue members this month"
// description — secondary line (optional): "All members are up to date"
// action    — optional: { label: 'Add member', onClick: fn }
// success   — boolean: if true, shows a green checkmark (good empty state)

export function EmptyState({ message, description, action, success = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.5rem',
      textAlign: 'center',
    }}>

      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: success ? '#f0fdf4' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        {success ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="1.5"/>
            <path d="M8 12h8" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Message */}
      <p style={{
        fontSize: '0.9375rem',
        fontWeight: '500',
        color: '#374151',
        margin: '0 0 0.25rem 0',
      }}>
        {message}
      </p>

      {/* Description */}
      {description && (
        <p style={{
          fontSize: '0.875rem',
          color: '#9ca3af',
          margin: '0 0 1.5rem 0',
          maxWidth: '240px',
        }}>
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            height: '44px',
            padding: '0 1.25rem',
            background: '#111111',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}