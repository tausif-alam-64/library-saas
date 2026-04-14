// app/(app)/seats/_components/SeatMapClient.jsx
'use client'

import { useLayoutEffect, useState, useCallback } from 'react'
import useSeatsStore from '@/stores/useSeatsStore'
import { SeatGrid } from '@/components/seats/SeatGrid'
import { SeatBottomSheet } from './SeatBottomSheet'

// initialSeats — array of transformed seat objects from the server
//                already in the format useSeatsStore expects
export function SeatMapClient({ initialSeats }) {
  const setSeats = useSeatsStore((state) => state.setSeats)
  const [selectedSeat, setSelectedSeat] = useState(null)

  // Hydrate Zustand before browser paints
  // Every page visit refreshes Zustand with server data
  // Realtime then provides delta updates on top of this baseline
  useLayoutEffect(() => {
    setSeats(initialSeats)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Empty dependency array is intentional — we only want to run on mount
  // The server component always passes fresh data when the page loads

  const handleSeatTap = useCallback((seat) => {
    setSelectedSeat(seat)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedSeat(null)
  }, [])

  return (
    <>
      <SeatGrid
        onSeatTap={handleSeatTap}
        selectedSeatId={selectedSeat?.id || null}
      />

      <SeatBottomSheet
        seat={selectedSeat}
        onClose={handleCloseSheet}
      />
    </>
  )
}