// app/(app)/seats/_components/SeatBottomSheet.jsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { FeeStatusBadge } from '@/components/ui/FeeStatusBadge'
import { ROUTES, SHIFTS } from '@/utils/constants'
import useUIStore from '@/stores/useUIStore'
import { toDbDate } from '@/utils/formatters'

// seat — the full seat object from Zustand
//        { id, seat_number, morning, evening, is_fulltime }
// onClose — called when sheet is dismissed
export function SeatBottomSheet({ seat, onClose }) {
  const router = useRouter()
  const showConfirm = useUIStore((state) => state.showConfirm)
  const addToast = useUIStore((state) => state.addToast)

  const isOpen = !!seat

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  function handleViewMember(memberId) {
    onClose()
    router.push(ROUTES.MEMBER_PROFILE(memberId))
  }

  function handleAssign(shift) {
    onClose()
    // Navigate to add member form with seat pre-selected
    // Phase 9 reads these query params and pre-fills the seat picker step
    router.push(
      `${ROUTES.MEMBER_NEW}?seat_id=${seat.id}&shift=${shift}&seat_number=${seat.seat_number}`
    )
  }

  function handleFreeSeat(allocationId, memberName, shift) {
    showConfirm({
      message: `Free seat ${seat.seat_number}?`,
      description: `${memberName}'s ${shift} allocation will be ended. This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          // No date sent from client — server uses its own local date
          // This prevents timezone bugs where client midnight = yesterday UTC
          const res = await fetch(`/api/allocations/${allocationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({}),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || 'Failed to free seat')
          }

          addToast(`Seat ${seat.seat_number} ${shift} freed`, 'success')
          onClose()
        } catch (err) {
          console.error('[SeatBottomSheet] freeSeat error:', err)
          addToast(err.message || 'Failed to free seat', 'error')
        }
      },
    })
  }

  return (
    <>
      {/* Backdrop — tapping outside closes the sheet */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 z-40 bg-black/40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={seat ? `Seat ${seat.seat_number} details` : 'Seat details'}
        className={`
          fixed bottom-0 left-0 right-0 z-50
    bg-white rounded-t-2xl
    transition-transform duration-300 ease-out
    max-h-[85dvh] flex flex-col
    ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4
                        border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Seat {seat?.seat_number}
            </h2>
            {seat?.is_fulltime && seat?.morning?.occupied && (
              <p className="text-xs text-gray-400 mt-0.5">Full time</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-full bg-gray-100 text-gray-500"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Slot sections      here we add pb-20 so that nothing is hide beneath bottomNav and moving max-h-[60dvh] for dynamic viewport height and put it on the whole sheet instead */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto pb-20">
          {seat && (
            <>
              {/* Fulltime — show as single section */}
              {seat.is_fulltime && seat.morning?.occupied ? (
                <SlotSection
                  label="Full Time"
                  slot={seat.morning}
                  onViewMember={handleViewMember}
                  onFreeSeat={(allocId, name) =>
                    handleFreeSeat(allocId, name, 'full time')
                  }
                />
              ) : (
                <>
                  {/* Morning section */}
                  <SlotSection
                    label="Morning"
                    slot={seat.morning}
                    onViewMember={handleViewMember}
                    onFreeSeat={(allocId, name) =>
                      handleFreeSeat(allocId, name, 'morning')
                    }
                    onAssign={() => handleAssign(SHIFTS.MORNING)}
                  />

                  <div className="border-t border-gray-100" />

                  {/* Evening section */}
                  <SlotSection
                    label="Evening"
                    slot={seat.evening}
                    onViewMember={handleViewMember}
                    onFreeSeat={(allocId, name) =>
                      handleFreeSeat(allocId, name, 'evening')
                    }
                    onAssign={() => handleAssign(SHIFTS.EVENING)}
                  />
                </>
              )}

              {/* Assign Full Time — only if both slots are free */}
              {!seat.is_fulltime &&
               !seat.morning?.occupied &&
               !seat.evening?.occupied && (
                <RoleGuard>
                  <button
                    onClick={() => handleAssign(SHIFTS.FULLTIME)}
                    className="w-full mt-1 h-11 rounded-xl border border-gray-200
                               text-sm font-medium text-gray-700
                               active:bg-gray-50 transition-colors touch-manipulation"
                  >
                    Assign full time
                  </button>
                </RoleGuard>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Sub-component: one shift row ────────────────────────────────────────────

function SlotSection({ label, slot, onViewMember, onFreeSeat, onAssign }) {
  const isOccupied = slot?.occupied

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left: label + member name or "Available" */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {isOccupied ? (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {slot.member_name || 'Member'}
            </p>
            {slot.fee_status && (
              <FeeStatusBadge status={slot.fee_status} />
            )}
          </div>
        ) : (
          <p className="text-sm text-green-600 font-medium">Available</p>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {isOccupied ? (
          <>
            {/* View member — all partners can do this */}
            <button
              onClick={() => onViewMember(slot.member_id)}
              className="h-9 px-3 rounded-lg bg-gray-100 text-xs font-medium
                         text-gray-700 active:bg-gray-200 touch-manipulation"
            >
              View
            </button>

            {/* Free seat — primary only */}
            <RoleGuard>
              <button
                onClick={() => onFreeSeat(slot.allocation_id, slot.member_name)}
                className="h-9 px-3 rounded-lg bg-red-50 text-xs font-medium
                           text-red-700 active:bg-red-100 touch-manipulation"
              >
                Free
              </button>
            </RoleGuard>
          </>
        ) : (
          /* Assign — primary only */
          <RoleGuard>
            {onAssign && (
              <button
                onClick={onAssign}
                className="h-9 px-4 rounded-lg bg-gray-900 text-xs font-medium
                           text-white active:bg-gray-700 touch-manipulation"
              >
                Assign
              </button>
            )}
          </RoleGuard>
        )}
      </div>
    </div>
  )
}