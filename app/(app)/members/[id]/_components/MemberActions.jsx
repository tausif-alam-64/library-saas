// app/(app)/members/[id]/_components/MemberActions.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import useUIStore from '@/stores/useUIStore'
import { ROUTES } from '@/utils/constants'
import { formatShift } from '@/utils/formatters'
// Relative import — not @/app/... which is wrong
import { SeatPickerStep } from '../../new/_components/SeatPickerStep'

export function MemberActions({ member, currentAllocation }) {
  const router     = useRouter()
  const { showConfirm, addToast } = useUIStore()

  const [isSheetOpen,       setIsSheetOpen]       = useState(false)
  const [isEditOpen,        setIsEditOpen]         = useState(false)
  const [isAssignSeatOpen,  setIsAssignSeatOpen]   = useState(false)
  const [isSubmitting,      setIsSubmitting]       = useState(false)
  const [isAssigning,       setIsAssigning]        = useState(false)
  const [assignSeatSelection, setAssignSeatSelection] = useState(null)
  const [assignSeats,       setAssignSeats]        = useState([])
  const [assignSeatsLoading, setAssignSeatsLoading] = useState(false)

  const [editForm, setEditForm] = useState({
    name:    member.name,
    phone:   member.phone,
    address: member.address || '',
    notes:   member.notes   || '',
  })

  function openSheet()  { setIsSheetOpen(true) }
  function closeSheet() { setIsSheetOpen(false) }

  function handleRecordPayment() {
    closeSheet()
    router.push(ROUTES.MEMBER_PAY(member.id))
  }

  function handleEditDetails() {
    closeSheet()
    setIsEditOpen(true)
  }

  async function handleAssignSeat() {
    closeSheet()
    setAssignSeatSelection(null)
    setIsAssignSeatOpen(true)
    setAssignSeatsLoading(true)

    try {
      const res = await fetch('/api/seats')
      if (!res.ok) throw new Error('Failed to load seats')
      const data = await res.json()
      setAssignSeats(data.seats || [])
    } catch (err) {
      console.error('[MemberActions] fetchSeats error:', err)
      addToast('Could not load seats. Please try again.', 'error')
      setIsAssignSeatOpen(false)
    } finally {
      setAssignSeatsLoading(false)
    }
  }

  async function handleConfirmAssignSeat() {
    if (!assignSeatSelection || isAssigning) return
    setIsAssigning(true)

    try {
      // Use local date — not toISOString() — to avoid UTC timezone shift
      const d     = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const res = await fetch(`/api/members/${member.id}/assign-seat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          seat_id:    assignSeatSelection.seat_id,
          shift:      assignSeatSelection.shift,
          start_date: today,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'SEAT_CONFLICT') {
          addToast('That seat and shift is already occupied', 'error')
          return
        }
        throw new Error(data.message || 'Failed to assign seat')
      }

      addToast(
        `Seat ${assignSeatSelection.seat_number} assigned to ${member.name}`,
        'success'
      )
      setIsAssignSeatOpen(false)
      setAssignSeatSelection(null)
      router.refresh()

    } catch (err) {
      console.error('[MemberActions] assignSeat error:', err)
      addToast(err.message || 'Failed to assign seat', 'error')
    } finally {
      setIsAssigning(false)
    }
  }

  // Add this function, keep handleConfirmAssignSeat for the outer button as fallback
async function handleConfirmAssignSeatWith(selection) {
  if (!selection || isAssigning) return
  setIsAssigning(true)

  try {
    // IST date for start_date
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const istDate = new Date(new Date().getTime() + IST_OFFSET_MS)
    const today = [
      istDate.getUTCFullYear(),
      String(istDate.getUTCMonth() + 1).padStart(2, '0'),
      String(istDate.getUTCDate()).padStart(2, '0'),
    ].join('-')

    const res = await fetch(`/api/members/${member.id}/assign-seat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        seat_id:    selection.seat_id,
        shift:      selection.shift,
        start_date: today,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.error === 'SEAT_CONFLICT') {
        addToast('That seat and shift is already occupied', 'error')
        setAssignSeatSelection(null)
        return
      }
      throw new Error(data.message || 'Failed to assign seat')
    }

    addToast(`Seat ${selection.seat_number} assigned to ${member.name}`, 'success')
    setIsAssignSeatOpen(false)
    setAssignSeatSelection(null)
    router.refresh()

  } catch (err) {
    console.error('[MemberActions] assignSeat error:', err)
    addToast(err.message || 'Failed to assign seat', 'error')
    setAssignSeatSelection(null)
  } finally {
    setIsAssigning(false)
  }
}

  async function handleSaveEdit() {
    if (isSubmitting) return

    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      addToast('Name must be at least 2 characters', 'error')
      return
    }

    const phone = editForm.phone.replace(/\D/g, '')
    if (phone.length !== 10) {
      addToast('Phone number must be exactly 10 digits', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:    editForm.name.trim(),
          phone:   editForm.phone.trim(),
          address: editForm.address.trim() || null,
          notes:   editForm.notes.trim()   || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to update member')
      }

      addToast('Member details updated', 'success')
      setIsEditOpen(false)
      router.refresh()
    } catch (err) {
      console.error('[MemberActions] editMember error:', err)
      addToast(err.message || 'Failed to update member', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleMarkInactive() {
    closeSheet()
    showConfirm({
      message:     `Mark ${member.name} as inactive?`,
      description: currentAllocation
        ? `Their seat ${currentAllocation.seat_number} ${currentAllocation.shift} will be freed.`
        : 'This member will be marked as inactive.',
      danger:    true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/members/${member.id}/status`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              status: 'inactive',
              reason: '7 days no show',
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || 'Failed to mark inactive')
          }

          addToast(`${member.name} marked as inactive`, 'success')
          router.push(ROUTES.MEMBERS)
          router.refresh()
        } catch (err) {
          console.error('[MemberActions] markInactive error:', err)
          addToast(err.message || 'Failed to mark inactive', 'error')
        }
      },
    })
  }

function handleReactivate() {
  closeSheet()
  showConfirm({
    message:     `Reactivate ${member.name}?`,
    description: 'They will return to active status with no seat assigned. You can assign a seat after reactivation.',
    danger:      false,
    onConfirm:   async () => {
      try {
        const res = await fetch(`/api/members/${member.id}/status`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            status: 'active',
            reason: 'Rejoined library',
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Failed to reactivate member')
        }

        addToast(`${member.name} reactivated`, 'success')
        // Refresh so the profile shows active status
        // and the "Assign new seat" button appears
        router.refresh()

      } catch (err) {
        console.error('[MemberActions] reactivate error:', err)
        addToast(err.message || 'Failed to reactivate member', 'error')
      }
    },
  })
}

  return (
    <RoleGuard>
      {/* Three-dots trigger */}
      <button
        onClick={openSheet}
        aria-label="Member actions"
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center
                   justify-center text-gray-600 active:bg-gray-200
                   touch-manipulation"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5"  r="1.5" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </button>

      {/* ── Action Sheet ── */}
      <>
        <div
          onClick={closeSheet}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                      ${isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      transition-transform duration-300 ease-out
                      ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="px-4 pb-20 space-y-1.5 pt-2">
            {/* Record payment */}
            <button
              onClick={handleRecordPayment}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                         bg-gray-50 active:bg-gray-100 touch-manipulation"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                              justify-center shrink-0">
                <svg className="w-4 h-4 text-green-700" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="12" rx="2"
                    stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Record payment</span>
            </button>

            {/* Assign new seat — only when no active allocation */}
            {!currentAllocation && member.status !== 'inactive' && (
              <button
                onClick={handleAssignSeat}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           bg-gray-50 active:bg-gray-100 touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                                justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-700" viewBox="0 0 24 24" fill="none">
                    <path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3
                             M2 11a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2
                             H4a2 2 0 01-2-2v-3z"
                      stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 16v2M18 16v2" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">Assign new seat</span>
              </button>
            )}

            {/* Edit details */}
            <button
              onClick={handleEditDetails}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                         bg-gray-50 active:bg-gray-100 touch-manipulation"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center
                              justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                           002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                           15H9v-2.828l8.586-8.586z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Edit details</span>
            </button>

            {/* Mark inactive */}
            {member.status === 'active' && (
              <button
                onClick={handleMarkInactive}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           bg-red-50 active:bg-red-100 touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center
                                justify-center shrink-0">
                  <svg className="w-4 h-4 text-danger" viewBox="0 0 24 24" fill="none">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728
                             12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-danger">Mark as inactive</span>
              </button>
            )}

            {/* Reactivate — only for inactive members */}
            {member.status === 'inactive' && (
              <button
                onClick={handleReactivate}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           bg-green-50 active:bg-green-100 touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                                justify-center shrink-0">
                  <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-success">Reactivate member</span>
              </button>
            )}

            {/* Cancel */}
            <button
              onClick={closeSheet}
              className="w-full h-12 mt-1 rounded-xl border border-gray-200
                         text-sm font-medium text-gray-600
                         active:bg-gray-50 touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      </>

      {/* ── Edit Details Sheet ── */}
      <>
        <div
          onClick={() => setIsEditOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                      ${isEditOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      transition-transform duration-300 ease-out
                      ${isEditOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="px-4 pb-20">
            <div className="flex items-center justify-between py-3 mb-1">
              <h2 className="text-base font-semibold text-primary">Edit details</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center
                           rounded-full bg-gray-100 text-gray-500"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Full name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-primary outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Phone number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-primary outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-primary outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl
                             text-sm text-primary outline-none resize-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-white rounded-xl
                           text-sm font-medium disabled:bg-gray-400
                           active:bg-gray-700 touch-manipulation
                           flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10"
                        stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="white"
                        strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </>

      {/* ── Assign Seat Sheet ── */}
      <>
        <div
          onClick={() => setIsAssignSeatOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                      ${isAssignSeatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assign new seat"
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      transition-transform duration-300 ease-out
                      max-h-[90vh] flex flex-col
                      ${isAssignSeatOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-4 pb-3 pt-2
                          border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-primary">
              Assign seat to {member.name}
            </h2>
            <button
              onClick={() => setIsAssignSeatOpen(false)}
              className="w-8 h-8 flex items-center justify-center
                         rounded-full bg-gray-100 text-gray-500"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Seat picker content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
            {assignSeatsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <svg className="w-6 h-6 animate-spin text-gray-400"
                  viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="#111111"
                    strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <p className="text-sm text-muted">Loading seats...</p>
              </div>
            ) : assignSeats.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted">No seats found.</p>
              </div>
            ) : (
              <SeatPickerStep
                initialSeats={assignSeats}
                onSelect={async (selection) => {
                  // Set selection for button label rendering
                  setAssignSeatSelection(selection)
                  // Immediately trigger assignment — no second tap required
                  await handleConfirmAssignSeatWith(selection)
                }}
                selectedSeatId={assignSeatSelection?.seat_id}
                selectedShift={assignSeatSelection?.shift}
              />
            )}
          </div>         
        </div>
      </>
    </RoleGuard>
  )
}