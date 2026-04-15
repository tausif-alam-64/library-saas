// components/seats/SeatCell.jsx

// Pure component — no hooks, no Zustand, no side effects
// Receives all data as props, calls onTap when pressed
//
// morning / evening — { occupied: bool, fee_status: string | null }
// isFulltime — true when one person occupies both shifts
// isSelected — highlights the cell when the bottom sheet is open for it

export function SeatCell({
  id,
  seatNumber,
  morning,
  evening,
  isFulltime,
  isSelected,
  onTap,
}) {
  // Color classes for each slot
  // Free: green. Occupied: red.
  // Fee status (paid/grace/overdue) is shown in the bottom sheet, not here
  // Keeping the grid clean and readable is more important than showing fee colors
  function slotClass(slot) {
    if (!slot?.occupied) return 'bg-green-100'
    return 'bg-red-100'
  }

  return (
    <button
      onClick={() => onTap({ id, seat_number: seatNumber, morning, evening, is_fulltime: isFulltime })}
      aria-label={`Seat ${seatNumber}`}
      // touch-manipulation removes 300ms tap delay on mobile
      // select-none prevents text selection on long press
      className={`
        relative rounded-lg overflow-hidden aspect-square w-full
        select-none touch-manipulation cursor-pointer
        border transition-all active:scale-95
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200'
        }
      `}
    >
      {/* Morning slot — top half */}
      <div className={`absolute inset-x-0 top-0 h-1/2 ${slotClass(morning)}`} />

      {/* Evening slot — bottom half */}
      {/* For fulltime, evening color matches morning — appears as one solid color */}
      <div className={`absolute inset-x-0 bottom-0 h-1/2 ${slotClass(evening)}`} />

      {/* Thin dividing line between morning and evening */}
      {/* Hidden for fulltime since both halves are same color */}
      {!isFulltime && (
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/80" />
      )}

      {/* Seat number — centered, semi-transparent white background */}
      {/* Readable against both green and red backgrounds */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-700 leading-none
                         bg-white/70 rounded px-0.5 py-px">
          {seatNumber}
        </span>
      </div>
    </button>
  )
}