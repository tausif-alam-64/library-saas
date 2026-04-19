// app/(app)/members/new/_components/SeatPickerStep.jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import useSeatsStore from '@/stores/useSeatsStore'
import { SHIFTS } from '@/utils/constants'
import { formatShift } from '@/utils/formatters'

export function SeatPickerStep({
  initialSeats = [],
  preselectedSeatId,
  preselectedShift,
  onSelect,
  selectedSeatId,
  selectedShift,
}) {
  const storeSeats  = useSeatsStore((state) => state.seats)
  const isLoaded    = useSeatsStore((state) => state.isLoaded)
  const setSeats    = useSeatsStore((state) => state.setSeats)

  // Hydrate store from server data if not already loaded
  // This runs once — if the user visited /seats before, the store already
  // has data and this is skipped. If not, initialSeats fills the gap.
  useEffect(() => {
    if (!isLoaded && initialSeats.length > 0) {
      setSeats(initialSeats)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Use store seats if available, fall back to initialSeats prop
  const seats = isLoaded ? storeSeats : initialSeats

  const [pendingSeat, setPendingSeat]   = useState(
    preselectedSeatId
      ? seats.find((s) => s.id === preselectedSeatId) || null
      : null
  )
  const [pendingShift, setPendingShift] = useState(preselectedShift || null)

  // Ref for the shift selector section — we scroll to it after tapping a seat
  const shiftSectionRef = useRef(null)

  function getAvailableShifts(seat) {
    const available = new Set()
    if (!seat.morning?.occupied && !seat.evening?.occupied) {
      available.add(SHIFTS.MORNING)
      available.add(SHIFTS.EVENING)
      available.add(SHIFTS.FULLTIME)
    } else if (!seat.morning?.occupied) {
      available.add(SHIFTS.MORNING)
    } else if (!seat.evening?.occupied) {
      available.add(SHIFTS.EVENING)
    }
    return available
  }

  function handleSeatTap(seat) {
    const available = getAvailableShifts(seat)
    if (available.size === 0) return

    setPendingSeat(seat)

    if (available.size === 1) {
      setPendingShift([...available][0])
    } else {
      if (pendingShift && available.has(pendingShift)) {
        // keep current shift selection
      } else {
        setPendingShift(null)
      }
    }

    // Scroll shift selector into view after a short delay
    // so the DOM has time to render it before scrollIntoView runs
    setTimeout(() => {
      shiftSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 80)
  }

  function handleShiftSelect(shift) {
    setPendingShift(shift)
  }

  function handleConfirm() {
    if (!pendingSeat || !pendingShift) return
    onSelect({
      seat_id:     pendingSeat.id,
      seat_number: pendingSeat.seat_number,
      shift:       pendingShift,
    })
  }

  const isConfirmable        = pendingSeat && pendingShift
  const availableForPending  = pendingSeat
    ? getAvailableShifts(pendingSeat)
    : new Set()

  if (seats.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-muted">Loading seats...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <p className="text-sm text-muted">
        Tap a green seat to select it, then choose a shift.
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-seat-free border border-seat-free-border" />
          <span className="text-xs text-muted">Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-seat-occupied border border-seat-occupied-border" />
          <span className="text-xs text-muted">Taken</span>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-muted">Top=Morning · Bottom=Evening</span>
        </div>
      </div>

      {/* Seat grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {seats.map((seat) => {
          const available       = getAvailableShifts(seat)
          const isFullyOccupied = available.size === 0
          const isSelected      = pendingSeat?.id === seat.id

          return (
            <button
              key={seat.id}
              onClick={() => handleSeatTap(seat)}
              disabled={isFullyOccupied}
              aria-label={`Seat ${seat.seat_number}`}
              className={`
                relative rounded-lg overflow-hidden aspect-square w-full
                select-none touch-manipulation border transition-all active:scale-95
                ${isFullyOccupied
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
                }
                ${isSelected
                  ? 'border-info ring-2 ring-blue-200'
                  : 'border-gray-200'
                }
              `}
            >
              <div className={`absolute inset-x-0 top-0 h-1/2
                ${seat.morning?.occupied ? 'bg-seat-occupied' : 'bg-seat-free'}`} />
              <div className={`absolute inset-x-0 bottom-0 h-1/2
                ${seat.evening?.occupied ? 'bg-seat-occupied' : 'bg-seat-free'}`} />
              {!seat.is_fulltime && (
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/80" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gray-700
                                 bg-white/70 rounded px-0.5">
                  {seat.seat_number}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Shift selector — rendered below the grid, scrolled into view on seat tap */}
      {/* ref attached here so scrollIntoView targets this exact section */}
      <div ref={shiftSectionRef}>
        {pendingSeat ? (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">
              Seat {pendingSeat.seat_number} selected
            </p>

            {/* Shift buttons */}
            <div className="flex gap-2">
              {[SHIFTS.MORNING, SHIFTS.EVENING, SHIFTS.FULLTIME].map((shift) => {
                const isAvailable = availableForPending.has(shift)
                const isChosen    = pendingShift === shift

                return (
                  <button
                    key={shift}
                    onClick={() => isAvailable && handleShiftSelect(shift)}
                    disabled={!isAvailable}
                    className={`
                      flex-1 h-11 rounded-xl border text-xs font-semibold
                      transition-all touch-manipulation
                      ${!isAvailable
                        ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                        : isChosen
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface border-gray-200 text-gray-700 active:bg-gray-50'
                      }
                    `}
                  >
                    {formatShift(shift)}
                  </button>
                )
              })}
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={!isConfirmable}
              className={`
                w-full h-11 rounded-xl text-sm font-semibold
                transition-all touch-manipulation
                ${isConfirmable
                  ? 'bg-success text-white active:opacity-90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isConfirmable
                ? `Confirm — Seat ${pendingSeat.seat_number} ${formatShift(pendingShift)}`
                : 'Select a shift above'
              }
            </button>
          </div>
        ) : (
          // Placeholder so layout doesn't jump — invisible but occupies space
          <div className="h-2" />
        )}
      </div>
    </div>
  )
}