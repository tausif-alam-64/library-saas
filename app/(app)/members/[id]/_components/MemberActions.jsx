// app/(app)/members/[id]/_components/MemberActions.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import useUIStore from '@/stores/useUIStore'
import { ROUTES } from '@/utils/constants'

export function MemberActions({ member, currentAllocation }) {
  const router = useRouter()
  const { showConfirm, addToast } = useUIStore()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state — pre-filled with current member data
  const [editForm, setEditForm] = useState({
    name: member.name,
    phone: member.phone,
    address: member.address || '',
    notes: member.notes || '',
  })

  function openSheet() { setIsSheetOpen(true) }
  function closeSheet() { setIsSheetOpen(false) }

  function handleRecordPayment() {
    closeSheet()
    router.push(ROUTES.MEMBER_PAY(member.id))
  }

  function handleEditDetails() {
    closeSheet()
    setIsEditOpen(true)
  }

  async function handleSaveEdit() {
    if (isSubmitting) return

    // Basic validation
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim() || null,
          notes: editForm.notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to update member')
      }

      addToast('Member details updated', 'success')
      setIsEditOpen(false)
      // Refresh server component data
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
      message: `Mark ${member.name} as inactive?`,
      description: currentAllocation
        ? `Their seat ${currentAllocation.seat_number} ${currentAllocation.shift} will be freed. This action can be reversed by contacting your administrator.`
        : 'This member will be marked as inactive.',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/members/${member.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'inactive',
              reason: '7 days no show',
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || 'Failed to mark inactive')
          }

          addToast(`${member.name} marked as inactive`, 'success')
          // Navigate back to members list after marking inactive
          router.push(ROUTES.MEMBERS)
          router.refresh()
        } catch (err) {
          console.error('[MemberActions] markInactive error:', err)
          addToast(err.message || 'Failed to mark inactive', 'error')
        }
      },
    })
  }

  return (
    // RoleGuard — viewers never see this component at all
    <RoleGuard>
      {/* Three-dots trigger button */}
      <button
        onClick={openSheet}
        aria-label="Member actions"
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center
                   justify-center text-gray-600 active:bg-gray-200
                   touch-manipulation"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </button>

      {/* ── Action Sheet ── */}
      <>
        {/* Backdrop */}
        <div
          onClick={closeSheet}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                      ${isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Member actions"
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      transition-transform duration-300 ease-out
                      ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 space-y-1.5">
            {/* Record payment */}
            <button
              onClick={handleRecordPayment}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                         bg-gray-50 active:bg-gray-100 touch-manipulation"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                              justify-center shrink-0">
                <svg className="w-4 h-4 text-green-700" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48
                           10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                    fill="currentColor"/>
                  <path d="M9 12h6M12 9v6" stroke="white" strokeWidth="2"
                    strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Record payment</span>
            </button>

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

            {/* Mark inactive — only if currently active */}
            {member.status === 'active' && (
              <button
                onClick={handleMarkInactive}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           bg-red-50 active:bg-red-100 touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center
                                justify-center shrink-0">
                  <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728
                             12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-red-700">Mark as inactive</span>
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
          aria-label="Edit member details"
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      transition-transform duration-300 ease-out
                      ${isEditOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center justify-between py-3 mb-1">
              <h2 className="text-base font-semibold text-gray-900">Edit details</h2>
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
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-gray-900 outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-gray-900 outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-gray-200 rounded-xl
                             text-sm text-gray-900 outline-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this member..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl
                             text-sm text-gray-900 outline-none resize-none
                             focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="w-full h-12 bg-gray-900 text-white rounded-xl
                           text-sm font-medium disabled:bg-gray-400
                           active:bg-gray-700 transition-colors touch-manipulation
                           flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)"
                        strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3"
                        strokeLinecap="round"/>
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
    </RoleGuard>
  )
}