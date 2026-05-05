// app/(app)/dashboard/_components/OverdueList.jsx

import Link from 'next/link'
import { OverdueMemberRow } from '@/components/reports/OverdueMemberRow'
import { ROUTES } from '@/utils/constants'

// members — [{ id, name, seat_number, shift, days_overdue, fee_status, days_left }]
//           sorted by days_overdue descending
// totalCount — total overdue count (may be more than shown)

export function OverdueList({ members, totalCount }) {
  return (
    <div className="mx-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Overdue & grace period
        </h2>
        {totalCount > members.length && (
          <Link
            href={`${ROUTES.MEMBERS}?filter=all`}   // <-  i am using all as a filter here in future i will impliment saperate filter for each valid filter
            className="text-xs text-info touch-manipulation"
          >
            See all {totalCount}
          </Link>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                            justify-center shrink-0">
              <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-success">
              All members are up to date
            </p>
          </div>
        ) : (
          members.map((m) => (
            <OverdueMemberRow
              key={m.id}
              member={m}
              showAmount={false}
            />
          ))
        )}
      </div>
    </div>
  )
}