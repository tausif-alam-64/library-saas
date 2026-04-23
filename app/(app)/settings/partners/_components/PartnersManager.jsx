// app/(app)/settings/partners/_components/PartnersManager.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import useUIStore from '@/stores/useUIStore'

const ROLE_LABELS = { primary: 'Primary', viewer: 'Viewer' }

export function PartnersManager({ partners, currentPartnerId, isPrimary }) {
  const router   = useRouter()
  const { addToast, showConfirm } = useUIStore()

  const [isAddOpen,    setIsAddOpen]    = useState(false)
  const [editingId,    setEditingId]    = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', role: 'viewer', temporary_password: '',
  })
  const [addErrors, setAddErrors] = useState({})

  const [editForm, setEditForm] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  function validateAdd() {
    const errs = {}
    if (!addForm.name.trim() || addForm.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }
    if (!addForm.email.trim() || !addForm.email.includes('@')) {
      errs.email = 'Valid email is required'
    }
    if (!addForm.temporary_password || addForm.temporary_password.length < 8) {
      errs.temporary_password = 'Password must be at least 8 characters'
    }
    if (!['primary', 'viewer'].includes(addForm.role)) {
      errs.role = 'Invalid role'
    }
    setAddErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleAddPartner() {
    if (!validateAdd() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/partners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.field) {
          setAddErrors({ [data.field]: data.message })
        } else {
          addToast(data.message || 'Failed to add partner', 'error')
        }
        return
      }

      addToast(`${addForm.name} added as ${addForm.role}`, 'success')
      setIsAddOpen(false)
      setAddForm({ name: '', email: '', phone: '', role: 'viewer', temporary_password: '' })
      setAddErrors({})
      router.refresh()

    } catch (err) {
      addToast('Failed to add partner', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEdit(partner) {
    setEditingId(partner.id)
    setEditForm({ name: partner.name, phone: partner.phone || '', role: partner.role })
  }

  async function handleSaveEdit(partnerId) {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:  editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          role:  editForm.role,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        addToast(data.message || 'Failed to update partner', 'error')
        return
      }

      addToast('Partner updated', 'success')
      setEditingId(null)
      router.refresh()

    } catch (err) {
      addToast('Failed to update partner', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleToggleActive(partner) {
    const action = partner.is_active ? 'deactivate' : 'reactivate'
    showConfirm({
      message:     `${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${partner.name}?`,
      description: action === 'deactivate'
        ? 'This partner will no longer be able to log in.'
        : 'This partner will be able to log in again.',
      danger:    action === 'deactivate',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/partners/${partner.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !partner.is_active }),
          })
          const data = await res.json()

          if (!res.ok) {
            addToast(data.message || `Failed to ${action} partner`, 'error')
            return
          }

          addToast(`${partner.name} ${action}d`, 'success')
          router.refresh()

        } catch (err) {
          addToast(`Failed to ${action} partner`, 'error')
        }
      },
    })
  }

  const inputCls = `
    w-full h-11 px-3.5 border border-gray-200 rounded-xl
    text-sm text-primary outline-none bg-surface
    focus:border-gray-400 transition-colors
  `

  return (
    <div className="pb-24">
      {/* Partners list */}
      <div className="mt-2 bg-white border-y border-gray-100">
        {partners.map((p) => {
          const isEditing = editingId === p.id
          const isYou     = p.id === currentPartnerId

          return (
            <div
              key={p.id}
              className={`px-4 py-4 border-b border-gray-50 last:border-b-0
                ${!p.is_active ? 'opacity-50' : ''}`}
            >
              {isEditing ? (
                /* Edit form */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    className={inputCls}
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className={inputCls}
                  />
                  {/* Role selector — cannot change own role */}
                  {!isYou && (
                    <div className="flex gap-2">
                      {['primary', 'viewer'].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, role }))}
                          className={`flex-1 h-10 rounded-xl border text-xs font-semibold
                            transition-all touch-manipulation
                            ${editForm.role === role
                              ? 'bg-primary border-primary text-white'
                              : 'border-gray-200 text-gray-700 active:bg-gray-50'
                            }`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 h-10 rounded-xl border border-gray-200
                                 text-xs font-medium text-muted active:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      disabled={isSubmitting}
                      className="flex-1 h-10 rounded-xl bg-primary text-white
                                 text-xs font-semibold disabled:bg-gray-300
                                 active:opacity-90 touch-manipulation"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Partner row */
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                   text-sm font-bold shrink-0
                                   ${p.role === 'primary'
                                     ? 'bg-primary text-white'
                                     : 'bg-gray-200 text-gray-600'
                                   }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary truncate">{p.name}</p>
                      {isYou && (
                        <span className="text-[10px] text-muted shrink-0">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                        ${p.role === 'primary'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                        {ROLE_LABELS[p.role]}
                      </span>
                      {!p.is_active && (
                        <span className="text-[10px] font-medium text-danger">Inactive</span>
                      )}
                      {p.phone && (
                        <span className="text-[10px] text-muted">{p.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — primary only */}
                  {isPrimary && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="h-8 px-3 rounded-lg bg-gray-100 text-xs
                                   font-medium text-gray-700 active:bg-gray-200
                                   touch-manipulation"
                      >
                        Edit
                      </button>
                      {!isYou && (
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`h-8 px-3 rounded-lg text-xs font-medium
                                      touch-manipulation
                                      ${p.is_active
                                        ? 'bg-red-50 text-danger active:bg-red-100'
                                        : 'bg-green-50 text-success active:bg-green-100'
                                      }`}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add partner — primary only */}
      <RoleGuard>
        <div className="px-4 mt-4">
          {!isAddOpen ? (
            <button
              onClick={() => setIsAddOpen(true)}
              className="w-full h-12 border-2 border-dashed border-gray-300
                         rounded-xl text-sm font-medium text-muted
                         active:border-gray-400 active:text-gray-700
                         touch-manipulation flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Add new partner
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-primary">New partner</h3>

              {/* Name */}
              <div>
                <input
                  type="text"
                  placeholder="Full name *"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
                {addErrors.name && (
                  <p className="text-xs text-danger mt-1">{addErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <input
                  type="email"
                  placeholder="Email address *"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={inputCls}
                />
                {addErrors.email && (
                  <p className="text-xs text-danger mt-1">{addErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Phone (optional)"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />

              {/* Role */}
              <div>
                <p className="text-xs text-muted mb-1.5">Role</p>
                <div className="flex gap-2">
                  {['viewer', 'primary'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, role }))}
                      className={`flex-1 h-10 rounded-xl border text-xs font-semibold
                        transition-all touch-manipulation
                        ${addForm.role === role
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-200 text-gray-700 active:bg-gray-50'
                        }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temporary password */}
              <div>
                <div className="relative ">
                    <input
                     type={showPassword ? 'text' : 'password'}
                     placeholder="Temporary password (min 8 chars) *"
                     value={addForm.temporary_password}
                     onChange={(e) => setAddForm((f) => ({ ...f, temporary_password: e.target.value }))}
                     className={inputCls}
                    />
                    <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted
                                 touch-manipulation min-h-0 min-w-0"
                     aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        {showPassword ? (
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        ) : (
                        <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                            stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </>
                        )}
                    </svg>
                    </button>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Share this with the partner — they can change it after logging in
                </p>
                {addErrors.temporary_password && (
                  <p className="text-xs text-danger mt-1">{addErrors.temporary_password}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setIsAddOpen(false); setAddErrors({}) }}
                  className="flex-1 h-11 rounded-xl border border-gray-200
                             text-sm font-medium text-muted active:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPartner}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-primary text-white
                             text-sm font-semibold disabled:bg-gray-300
                             active:opacity-90 touch-manipulation"
                >
                  {isSubmitting ? 'Adding...' : 'Add partner'}
                </button>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </div>
  )
}