// app/(app)/dashboard/_components/RecentActivity.jsx

import { RelativeDate } from '@/components/ui/RelativeDate'

// activities — [{ id, action, description, partner_name, created_at }]

const ACTION_ICONS = {
  create_member: { bg: 'bg-green-100', icon: (
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6"
      stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  )},
  record_payment: { bg: 'bg-blue-100', icon: (
    <><rect x="2" y="6" width="20" height="12" rx="2"
        stroke="#1d4ed8" strokeWidth="2"/>
      <path d="M12 10v4M10 12h4" stroke="#1d4ed8"
        strokeWidth="2" strokeLinecap="round"/></>
  )},
  mark_member_inactive: { bg: 'bg-red-100', icon: (
    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
  )},
  reactivate_member: { bg: 'bg-green-100', icon: (
  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    stroke="#15803d" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round"/>
)},
  end_allocation: { bg: 'bg-amber-100', icon: (
    <><path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"
        stroke="#d97706" strokeWidth="2"/>
      <path d="M2 11h20M6 16v2M18 16v2" stroke="#d97706"
        strokeWidth="2" strokeLinecap="round"/></>
  )},
  assign_seat: { bg: 'bg-purple-100', icon: (
    <><path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3M2 11a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3z"
        stroke="#7c3aed" strokeWidth="2"/>
      <path d="M6 16v2M18 16v2" stroke="#7c3aed"
        strokeWidth="2" strokeLinecap="round"/></>
  )},
  update_member: { bg: 'bg-gray-100', icon: (
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  )},
}

function getActionDisplay(action) {
  const labels = {
    create_member:        'Member added',
    record_payment:       'Payment recorded',
    mark_member_inactive: 'Member marked inactive',
    end_allocation:       'Seat freed',
    assign_seat:          'Seat assigned',
    update_member:        'Member updated',
    delete_member:        'Member deleted',
  }
  return labels[action] || action.replace(/_/g, ' ')
}

export function RecentActivity({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="mx-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider
                       text-muted mb-2">
          Recent activity
        </h2>
        <div className="bg-surface rounded-2xl border border-gray-100
                        px-4 py-6 text-center">
          <p className="text-sm text-muted">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <h2 className="text-base font-medium
                     text-muted mb-3">
        Recent Activity
      </h2>
      <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
        {activities.map((act, i) => {
          const iconData = ACTION_ICONS[act.action] || ACTION_ICONS.update_member

          return (
            <div
              key={act.id || i}
              className="flex items-start gap-3 px-4 py-3.5
                         border-b border-gray-50 last:border-b-0"
            >
              {/* Action icon */}
              <div className={`w-10 h-10 rounded-lg ${iconData.bg} flex items-center
                               justify-center shrink-0`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  {iconData.icon}
                </svg>
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {getActionDisplay(act.action)}
                </p>
                <p className="text-xs text-muted mt-0.5 leading-snug truncate">
                  {act.description}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {act.partner_name} ·{' '}
                  <RelativeDate date={act.created_at} />
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}