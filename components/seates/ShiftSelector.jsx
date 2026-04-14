// components/seats/ShiftSelector.jsx
'use client'

import { SHIFTS } from '@/utils/constants'

// Available shifts to show as selectable options
// disabled — set of shift strings that are unavailable (already occupied)
// selected — currently selected shift
// onSelect — called with the shift string when tapped
// fees — { morning: 500, evening: 500, fulltime: 900 }
export function ShiftSelector({ disabled = new Set(), selected, onSelect, fees }) {
  const options = [
    { shift: SHIFTS.MORNING, label: 'Morning', sublabel: fees ? `₹${fees.morning}/mo` : null },
    { shift: SHIFTS.EVENING, label: 'Evening', sublabel: fees ? `₹${fees.evening}/mo` : null },
    { shift: SHIFTS.FULLTIME, label: 'Full Time', sublabel: fees ? `₹${fees.fulltime}/mo` : null },
  ]

  return (
    <div className="flex gap-2">
      {options.map(({ shift, label, sublabel }) => {
        const isDisabled = disabled.has(shift)
        const isSelected = selected === shift

        return (
          <button
            key={shift}
            onClick={() => !isDisabled && onSelect(shift)}
            disabled={isDisabled}
            className={`
              flex-1 flex flex-col items-center justify-center
              py-2.5 px-1 rounded-xl border text-center
              transition-all touch-manipulation
              ${isDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                : isSelected
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
              }
            `}
          >
            <span className="text-xs font-semibold">{label}</span>
            {sublabel && (
              <span className={`text-[10px] mt-0.5 ${
                isDisabled ? 'text-gray-300' :
                isSelected ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {sublabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}