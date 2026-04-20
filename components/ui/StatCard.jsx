// components/ui/StatCard.jsx

// label    — muted uppercase label above the number
// value    — the main metric (string or number)
// sub      — optional small text below the value
// accent   — 'default' | 'danger' | 'warning' | 'success'
//            changes the value color to signal urgency
// onClick  — optional — makes the card tappable (navigates to detail)

export function StatCard({ label, value, sub, accent = 'default', onClick }) {
  const valueColors = {
    default: 'text-primary',
    danger:  'text-danger',
    warning: 'text-warning',
    success: 'text-success',
  }

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`
        flex flex-col bg-surface rounded-2xl p-4
        border border-gray-100
        ${onClick
          ? 'active:bg-gray-50 touch-manipulation cursor-pointer text-left w-full'
          : ''
        }
      `}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest
                    text-muted mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-none mb-1
                     ${valueColors[accent]}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted mt-0.5 leading-snug">{sub}</p>
      )}
    </Wrapper>
  )
}