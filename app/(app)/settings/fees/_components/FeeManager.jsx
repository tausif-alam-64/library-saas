// app/(app)/settings/fees/_components/FeeManager.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { formatCurrency, formatDate } from '@/utils/formatters'
import useUIStore from '@/stores/useUIStore'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function FeeManager({ current, history, isPrimary }) {
  const router   = useRouter()
  const addToast = useUIStore((state) => state.addToast)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    morning_fee:  String(current?.morning_fee  || 500),
    evening_fee:  String(current?.evening_fee  || 500),
    fulltime_fee: String(current?.fulltime_fee || 900),
    valid_from:   localDateStr(new Date()),
  })
  const [errors,       setErrors]       = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const errs = {}
    const fees = [
      ['morning_fee',  form.morning_fee],
      ['evening_fee',  form.evening_fee],
      ['fulltime_fee', form.fulltime_fee],
    ]
    fees.forEach(([field, val]) => {
      const n = parseFloat(val)
      if (isNaN(n) || n <= 0) {
        errs[field] = 'Must be a positive number'
      }
    })
    if (!form.valid_from) {
      errs.valid_from = 'Effective date is required'
    }
    const todayStr = localDateStr(new Date())
    if (form.valid_from < todayStr) {
      errs.valid_from = 'Effective date cannot be in the past'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/fee-structures', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          morning_fee:  parseFloat(form.morning_fee),
          evening_fee:  parseFloat(form.evening_fee),
          fulltime_fee: parseFloat(form.fulltime_fee),
          valid_from:   form.valid_from,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.message })
        } else {
          addToast(data.message || 'Failed to update fees', 'error')
        }
        return
      }

      addToast('Fee structure updated', 'success')
      setIsEditing(false)
      router.refresh()

    } catch (err) {
      addToast('Failed to update fees', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = `
    w-full h-11 px-3.5 border border-gray-200 rounded-xl
    text-sm text-primary outline-none bg-surface
    focus:border-gray-400 transition-colors
  `

  return (
    <div className="pb-24">
      {/* Current fee structure */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Current fees
        </h2>

        {current ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {[
              { label: 'Morning shift',   fee: current.morning_fee  },
              { label: 'Evening shift',   fee: current.evening_fee  },
              { label: 'Full time',       fee: current.fulltime_fee },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between px-4 py-3.5
                           border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-muted">{row.label}</span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(row.fee)}/month
                </span>
              </div>
            ))}
            <div className="px-4 py-2 bg-gray-50">
              <p className="text-[10px] text-muted">
                Effective from {formatDate(current.valid_from)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-100 px-4 py-4">
            <p className="text-sm text-amber-800 font-medium">No fee structure set</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add fee structure to enable payment recording
            </p>
          </div>
        )}
      </div>

      {/* Update fees — primary only */}
      <RoleGuard>
        <div className="px-4 mt-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full h-12 border-2 border-dashed border-gray-300
                         rounded-xl text-sm font-medium text-muted
                         active:border-gray-400 touch-manipulation
                         flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round"/>
              </svg>
              Update fee structure
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200 p-4 space-y-3">
              {/* Warning */}
              <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-800">
                  Important: changing fees creates a new record
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Previous payments are unaffected. New fee applies from the effective date.
                </p>
              </div>

              {/* Morning */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Morning fee (₹/month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                                   text-sm font-bold text-muted pointer-events-none">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.morning_fee}
                    onChange={(e) => setForm((f) => ({ ...f, morning_fee: e.target.value }))}
                    className={`${inputCls} pl-8`}
                  />
                </div>
                {errors.morning_fee && (
                  <p className="text-xs text-danger mt-1">{errors.morning_fee}</p>
                )}
              </div>

              {/* Evening */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Evening fee (₹/month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                                   text-sm font-bold text-muted pointer-events-none">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.evening_fee}
                    onChange={(e) => setForm((f) => ({ ...f, evening_fee: e.target.value }))}
                    className={`${inputCls} pl-8`}
                  />
                </div>
                {errors.evening_fee && (
                  <p className="text-xs text-danger mt-1">{errors.evening_fee}</p>
                )}
              </div>

              {/* Fulltime */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Full time fee (₹/month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                                   text-sm font-bold text-muted pointer-events-none">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.fulltime_fee}
                    onChange={(e) => setForm((f) => ({ ...f, fulltime_fee: e.target.value }))}
                    className={`${inputCls} pl-8`}
                  />
                </div>
                {errors.fulltime_fee && (
                  <p className="text-xs text-danger mt-1">{errors.fulltime_fee}</p>
                )}
              </div>

              {/* Effective date */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Effective from
                </label>
                <input
                  type="date"
                  value={form.valid_from}
                  min={localDateStr(new Date())}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  className={inputCls}
                />
                <p className="text-[10px] text-muted mt-1">
                  Today or a future date. Cannot be in the past.
                </p>
                {errors.valid_from && (
                  <p className="text-xs text-danger mt-1">{errors.valid_from}</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setIsEditing(false); setErrors({}) }}
                  className="flex-1 h-11 rounded-xl border border-gray-200
                             text-sm font-medium text-muted active:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-primary text-white
                             text-sm font-semibold disabled:bg-gray-300
                             active:opacity-90 touch-manipulation"
                >
                  {isSubmitting ? 'Saving...' : 'Save new fees'}
                </button>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>

      {/* Fee history */}
      {history.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Fee history
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {history.map((h) => (
              <div
                key={h.id}
                className="px-4 py-3.5 border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted">
                    {formatDate(h.valid_from)} — {formatDate(h.valid_until)}
                  </p>
                </div>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-gray-500">
                    M: {formatCurrency(h.morning_fee)}
                  </span>
                  <span className="text-xs text-gray-500">
                    E: {formatCurrency(h.evening_fee)}
                  </span>
                  <span className="text-xs text-gray-500">
                    FT: {formatCurrency(h.fulltime_fee)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}