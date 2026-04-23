// app/(app)/settings/seats/_components/SeatsManager.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/ui/RoleGuard'
import useUIStore from '@/stores/useUIStore'

export function SeatsManager({
  seats, isPrimary, activeSeatCount, occupiedSeatCount, maxSeatNumber
}) {
  const router    = useRouter()
  const { addToast, showConfirm } = useUIStore()

  const [isAdding,    setIsAdding]    = useState(false)
  const [fromNumber,  setFromNumber]  = useState(String(maxSeatNumber + 1))
  const [toNumber,    setToNumber]    = useState(String(maxSeatNumber + 1))
  const [rowLabel,    setRowLabel]    = useState('')
  const [addError,    setAddError]    = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAddSeats() {
    setAddError('')
    const from = parseInt(fromNumber)
    const to   = parseInt(toNumber)

    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      setAddError('Invalid seat number range')
      return
    }
    if (to - from > 99) {
      setAddError('Cannot add more than 100 seats at once')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/seats', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_number: from,
          to_number:   to,
          row_label:   rowLabel.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAddError(data.message || 'Failed to add seats')
        return
      }

      addToast(`${data.added} seat${data.added !== 1 ? 's' : ''} added`, 'success')
      setIsAdding(false)
      setFromNumber(String(to + 1))
      setToNumber(String(to + 1))
      setRowLabel('')
      router.refresh()

    } catch (err) {
      setAddError('Failed to add seats')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleToggleActive(seat) {
    if (seat.is_occupied && seat.is_active) {
      addToast(
        `Cannot deactivate Seat ${seat.seat_number} — ${seat.occupant} is currently assigned here`,
        'error'
      )
      return
    }

    const action = seat.is_active ? 'deactivate' : 'activate'

    showConfirm({
      message:     `${action === 'deactivate' ? 'Deactivate' : 'Activate'} Seat ${seat.seat_number}?`,
      description: action === 'deactivate'
        ? 'This seat will be removed from the seat map.'
        : 'This seat will appear on the seat map again.',
      danger:    action === 'deactivate',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/seats/${seat.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !seat.is_active }),
          })
          const data = await res.json()

          if (!res.ok) {
            addToast(data.message || `Failed to ${action} seat`, 'error')
            return
          }

          addToast(`Seat ${seat.seat_number} ${action}d`, 'success')
          router.refresh()

        } catch (err) {
          addToast(`Failed to ${action} seat`, 'error')
        }
      },
    })
  }

  const inputCls = `
    flex-1 h-11 px-3.5 border border-gray-200 rounded-xl
    text-sm text-primary outline-none bg-surface
    focus:border-gray-400 transition-colors
  `

  return (
    <div className="pb-24">
      {/* Summary */}
      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-primary">{activeSeatCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">Active</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-success">{occupiedSeatCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">Occupied</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-muted">{activeSeatCount - occupiedSeatCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">Free</p>
        </div>
      </div>

      {/* Add seats section — primary only */}
      <RoleGuard>
        <div className="px-4 mb-3">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full h-12 border-2 border-dashed border-gray-300
                         rounded-xl text-sm font-medium text-muted
                         active:border-gray-400 touch-manipulation
                         flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Add more seats
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-primary">Add seats</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <p className="text-[10px] text-muted mb-1">From seat #</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <p className="text-sm text-muted pb-3">to</p>
                <div className="flex-1">
                  <p className="text-[10px] text-muted mb-1">To seat #</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Row label (optional — e.g. Window Row)"
                value={rowLabel}
                onChange={(e) => setRowLabel(e.target.value)}
                className={`${inputCls} w-full`}
              />
              {addError && (
                <p className="text-xs text-danger">{addError}</p>
              )}
              {fromNumber && toNumber && parseInt(fromNumber) <= parseInt(toNumber) && (
                <p className="text-xs text-muted">
                  Adding {parseInt(toNumber) - parseInt(fromNumber) + 1} seat
                  {parseInt(toNumber) !== parseInt(fromNumber) ? 's' : ''} (#{fromNumber} to #{toNumber})
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsAdding(false); setAddError('') }}
                  className="flex-1 h-11 rounded-xl border border-gray-200
                             text-sm font-medium text-muted active:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSeats}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-primary text-white
                             text-sm font-semibold disabled:bg-gray-300
                             active:opacity-90 touch-manipulation"
                >
                  {isSubmitting ? 'Adding...' : 'Add seats'}
                </button>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>

      {/* Seat list */}
      <div className="bg-white border-y border-gray-100">
        {seats.map((seat) => (
          <div
            key={seat.id}
            className={`flex items-center gap-3 px-4 py-3.5
                         border-b border-gray-50 last:border-b-0
                         ${!seat.is_active ? 'opacity-40' : ''}`}
          >
            {/* Seat number */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                              text-sm font-bold shrink-0
                              ${seat.is_occupied
                                ? 'bg-red-100 text-danger'
                                : seat.is_active
                                  ? 'bg-green-100 text-success'
                                  : 'bg-gray-100 text-muted'
                              }`}>
              {seat.seat_number}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary">
                Seat {seat.seat_number}
                {seat.row_label && (
                  <span className="text-xs text-muted ml-1.5">({seat.row_label})</span>
                )}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {seat.is_occupied
                  ? `${seat.occupant} — ${seat.shift}`
                  : seat.is_active
                    ? 'Available'
                    : 'Inactive'
                }
              </p>
            </div>

            {/* Toggle active — primary only */}
            {isPrimary && (
              <button
                onClick={() => handleToggleActive(seat)}
                className={`h-8 px-3 rounded-lg text-xs font-medium
                            touch-manipulation shrink-0
                            ${seat.is_active
                              ? seat.is_occupied
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-red-50 text-danger active:bg-red-100'
                              : 'bg-green-50 text-success active:bg-green-100'
                            }`}
              >
                {seat.is_active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}