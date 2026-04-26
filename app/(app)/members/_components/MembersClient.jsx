// app/(app)/members/_components/MembersClient.jsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MemberCard } from '@/components/members/MemberCard'
import { MemberSearchBar } from '@/components/members/MemberSearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { ROUTES, FEE_STATUS } from '@/utils/constants'

// Filter pill labels and their matching logic
const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'grace',    label: 'Grace' },
  { key: 'unpaid',   label: 'Unpaid'},
  { key: 'paid',     label: 'Paid' },
  { key: 'inactive', label: 'Inactive' },
]

function sortMembers(members) {
  // Priority order: overdue (most urgent) → grace → unpaid → paid
  // Within each group: overdue sorts by days overdue desc (most overdue first)
  //                    grace sorts by days left asc (least days left = most urgent)
  //                    unpaid sorts alphabetically
  //                    paid sorts alphabetically
  const priority = {
    [FEE_STATUS.OVERDUE]: 0,
    [FEE_STATUS.GRACE]:   1,
    [FEE_STATUS.UNPAID]:  2,
    [FEE_STATUS.PAID]:    3,
  }

  return [...members].sort((a, b) => {
    if (a.status === 'inactive' && b.status !== 'inactive') return 1
    if (b.status === 'inactive' && a.status !== 'inactive') return -1

    const pa = priority[a.fee_status] ?? 4
    const pb = priority[b.fee_status] ?? 4

    if (pa !== pb) return pa - pb

    if (a.fee_status === FEE_STATUS.OVERDUE && b.fee_status === FEE_STATUS.OVERDUE) {
      return (b.days_overdue || 0) - (a.days_overdue || 0)
    }
    if (a.fee_status === FEE_STATUS.GRACE && b.fee_status === FEE_STATUS.GRACE) {
      return (a.days_left || 0) - (b.days_left || 0)
    }

    return a.name.localeCompare(b.name, 'en-IN')
  })
}

export function MembersClient({ initialMembers, totalCount }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  // Filter then sort — all client-side, instant for ~200 members
  const displayMembers = useMemo(() => {
    let result = initialMembers

    // Search — name or phone, case-insensitive
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q)
      )
    }

    // Status filter
    if (activeFilter === 'inactive') {
      result = result.filter((m) => m.status === 'inactive')
    } else if (activeFilter === 'all') {
      // Default: show all non-inactive members
      result = result.filter((m) => m.status !== 'inactive')
    } else {
      // paid, grace, overdue, unpaid
      result = result.filter((m) =>
        m.status !== 'inactive' && m.fee_status === activeFilter
      )
    }

    return sortMembers(result)
  }, [initialMembers, searchQuery, activeFilter])

  // Count for each filter pill — shows how many are in each category
  const counts = useMemo(() => {
    const active = initialMembers.filter((m) => m.status !== 'inactive')
    return {
      all: active.length,
      overdue: active.filter((m) => m.fee_status === FEE_STATUS.OVERDUE).length,
      grace: active.filter((m) => m.fee_status === FEE_STATUS.GRACE).length,
      unpaid: active.filter((m) => m.fee_status === FEE_STATUS.UNPAID).length,
      paid: active.filter((m) => m.fee_status === FEE_STATUS.PAID).length,
      inactive: initialMembers.filter((m) => m.status === 'inactive').length,
    }
  }, [initialMembers])

  function emptyMessage() {
    if (searchQuery)              return 'No members found'
    if (activeFilter === 'inactive') return 'No inactive members'
    if (activeFilter === 'overdue')  return 'No overdue members'
    if (activeFilter === 'grace')    return 'No members in grace period'
    if (activeFilter === 'unpaid')   return 'No unpaid members'
    if (activeFilter === 'paid')     return 'No paid members'
    return 'No members yet'
  }

  function emptyDescription() {
    if (searchQuery)                return 'Try a different name or phone number'
    if (activeFilter === 'overdue') return 'All members are up to date ✓'
    if (activeFilter === 'unpaid')  return 'All active members have at least one payment'
    if (activeFilter === 'all')     return 'Add your first member to get started'
    return undefined
  }

  const isSuccessEmpty =
    (activeFilter === 'overdue' || activeFilter === 'unpaid') &&
    displayMembers.length === 0 &&
    !searchQuery

  return (
    <>
      {/* Sticky search + filter section */}
      <div className="sticky top-14 z-30 bg-gray-50 px-4 pt-3 pb-2 space-y-2.5">
        <MemberSearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Filter pills — horizontally scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {FILTERS.map(({ key, label }) => {
            const count = counts[key]
            const isActive = activeFilter === key
            const isDanger = (key === 'overdue' || key === 'unpaid') && count > 0 && !isActive

            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex items-center gap-1 h-8 px-3 rounded-full
                            text-xs font-medium whitespace-nowrap
                            transition-colors touch-manipulation shrink-0
                            ${isActive
                              ? 'bg-primary text-white'
                              : isDanger
                                ? 'bg-surface text-danger border border-red-200'
                                : 'bg-surface text-gray-600 border border-gray-200'
                            }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold
                    ${isActive
                      ? 'text-gray-300'
                      : isDanger
                        ? 'text-danger'
                        : 'text-muted'
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {/* searchbar and filter pill cover member list that why we need to add extra spacer on the top of member list */}
      <div className="h-14" />      

      {/* Results count */}
      {searchQuery && (
        <p className="px-4 py-2 text-xs text-muted">
          {displayMembers.length} result{displayMembers.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
        </p>
      )}

      {/* Members list */}
      <div className="bg-white mx-0 mt-2 border-y border-gray-100">
        {displayMembers.length === 0 ? (
          <EmptyState
            message={emptyMessage()}
            description={emptyDescription()}
            success={isSuccessEmpty}
            action={
              !searchQuery && activeFilter === 'all' && displayMembers.length === 0
                ? { label: 'Add first member', onClick: () => router.push(ROUTES.MEMBER_NEW) }
                : undefined
            }
          />
        ) : (
          displayMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))
        )}
      </div>

      {/* Total count footer */}
      {displayMembers.length > 0 && (
        <p className="px-4 py-3 text-xs text-gray-400 text-center">
          Showing {displayMembers.length} of {totalCount} members
        </p>
      )}

      {/* Floating action button — primary partner only */}
      {/* Positioned above the BottomNav (72px) + a bit of breathing room */}
      <RoleGuard>
        <button
          onClick={() => router.push(ROUTES.MEMBER_NEW)}
          aria-label="Add new member"
          className="fixed bottom-20 right-4 z-40
                     w-14 h-14 rounded-full bg-gray-900 text-white
                     flex items-center justify-center
                     shadow-lg active:scale-95 transition-transform
                     touch-manipulation"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </RoleGuard>
    </>
  )
}