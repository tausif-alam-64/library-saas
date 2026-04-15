// components/seats/SeatGrid.jsx
"use client";

import useSeatsStore from "@/stores/useSeatsStore";
import { SeatCell } from "./SeatCell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// onSeatTap — called when any seat cell is tapped
//             receives the full seat object { id, seatNumber, morning, evening, isFulltime }
// selectedSeatId — the id of the currently open bottom sheet seat (for highlight)
export function SeatGrid({ onSeatTap, selectedSeatId }) {
  const seats = useSeatsStore((state) => state.seats);
  const isLoaded = useSeatsStore((state) => state.isLoaded);

  // Show spinner while initial data is being hydrated into Zustand
  if (!isLoaded) {
    return <LoadingSpinner label="Loading seat map..." />;
  }

  if (seats.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-gray-500">No seats configured.</p>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-xs text-gray-500">Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-xs text-gray-500">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Split cell legend */}
          <div className="w-3 h-3 rounded overflow-hidden border border-gray-200">
            <div className="h-1/2 bg-red-100" />
            <div className="h-1/2 bg-green-100" />
          </div>
          <span className="text-xs text-gray-500">Partial</span>
        </div>
        <div className="flex flex-col gap-1 ml-auto text-xs text-gray-400">
          <span>Top = Morning</span> <span>Bottom = Evening</span>
        </div>
      </div>

      {/* 7-column grid */}
      {/* gap-1.5 gives ~6px between cells — enough to distinguish without wasting space */}
      <div className="grid grid-cols-7 gap-2">
        {seats.map((seat) => (
          <SeatCell
            key={seat.id}
            id={seat.id}
            seatNumber={seat.seat_number}
            morning={seat.morning}
            evening={seat.evening}
            isFulltime={seat.is_fulltime}
            isSelected={selectedSeatId === seat.id}
            onTap={onSeatTap}
          />
        ))}
      </div>
    </div>
  );
}
