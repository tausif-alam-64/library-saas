// app/(app)/settings/_components/LibrarySettingsForm.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useUIStore from '@/stores/useUIStore'

export function LibrarySettingsForm({ library, isPrimary }) {
  const router   = useRouter()
  const addToast = useUIStore((state) => state.addToast)

  const [form, setForm] = useState({
    name:                library.name          || '',
    address:             library.address        || '',
    phone:               library.phone          || '',
    morning_cutoff_time: library.morning_cutoff_time || '13:00',
    grace_period_days:   String(library.grace_period_days ?? 10),
    no_show_days:        String(library.no_show_days ?? 7),
  })

  const [errors,       setErrors]       = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const errs = {}
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Library name must be at least 2 characters'
    }
    if (!form.address.trim()) {
      errs.address = 'Address is required'
    }
    const grace = parseInt(form.grace_period_days)
    if (isNaN(grace) || grace < 0 || grace > 30) {
      errs.grace_period_days = 'Grace period must be 0–30 days'
    }
    const noShow = parseInt(form.no_show_days)
    if (isNaN(noShow) || noShow < 1 || noShow > 60) {
      errs.no_show_days = 'No-show period must be 1–60 days'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!isPrimary || isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/settings/library', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                form.name.trim(),
          address:             form.address.trim(),
          phone:               form.phone.trim() || null,
          morning_cutoff_time: form.morning_cutoff_time,
          grace_period_days:   parseInt(form.grace_period_days),
          no_show_days:        parseInt(form.no_show_days),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save settings')

      addToast('Library settings saved', 'success')
      // router.refresh() triggers the server layout to re-run,
      // which passes fresh library data to AppShell, which calls setSession()
      // updating the Zustand store with new grace_period_days etc.
      router.refresh()

    } catch (err) {
      console.error('[LibrarySettingsForm]', err)
      addToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = (hasError) => `
    w-full h-11 px-3.5 border rounded-xl text-sm text-primary
    bg-surface outline-none transition-colors
    ${hasError ? 'border-danger' : 'border-gray-200'}
    ${isPrimary
      ? 'focus:border-gray-400'
      : 'bg-gray-50 text-muted cursor-not-allowed'
    }
  `

  return (
    <div className="bg-white px-4 pt-4 pb-6 border-y border-gray-100">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
        Library configuration
      </h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Library name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(!!errors.name)}
          />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Address <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(!!errors.address)}
          />
          {errors.address && <p className="text-xs text-danger mt-1">{errors.address}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(false)}
          />
        </div>

        {/* Morning cutoff time */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Morning shift ends at
          </label>
          <input
            type="time"
            value={form.morning_cutoff_time}
            onChange={(e) => setForm((f) => ({ ...f, morning_cutoff_time: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(false)}
          />
          <p className="text-[10px] text-muted mt-1">
            Currently {form.morning_cutoff_time} — everything before this is morning shift
          </p>
        </div>

        {/* Grace period */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Grace period (days after due date)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="30"
            value={form.grace_period_days}
            onChange={(e) => setForm((f) => ({ ...f, grace_period_days: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(!!errors.grace_period_days)}
          />
          <p className="text-[10px] text-muted mt-1">
            Members are marked overdue after this many days past due date
          </p>
          {errors.grace_period_days && (
            <p className="text-xs text-danger mt-1">{errors.grace_period_days}</p>
          )}
        </div>

        {/* No-show days */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Assumed left after (days absent)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="60"
            value={form.no_show_days}
            onChange={(e) => setForm((f) => ({ ...f, no_show_days: e.target.value }))}
            disabled={!isPrimary}
            className={inputCls(!!errors.no_show_days)}
          />
          <p className="text-[10px] text-muted mt-1">
            You told us: if absent for {form.no_show_days} days, assume the member has left
          </p>
          {errors.no_show_days && (
            <p className="text-xs text-danger mt-1">{errors.no_show_days}</p>
          )}
        </div>

        {isPrimary && (
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl
                       text-sm font-semibold disabled:bg-gray-300
                       active:opacity-90 touch-manipulation
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
              'Save settings'
            )}
          </button>
        )}

        {!isPrimary && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted">
              Only the primary partner can change settings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}