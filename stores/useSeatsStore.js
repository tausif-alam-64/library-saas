// stores/useSeatsStore.js

import { create } from 'zustand'

const useSeatsStore = create((set, get) => ({
  // Array of all 56 seat objects with current occupancy
  // Each seat: { id, seat_number, row_label, is_active, morning, evening }
  // morning/evening: { occupied: bool, member_id, member_name, fee_status }
  seats: [],

  // True after the initial server-side data has been loaded into this store
  isLoaded: false,

  // Called once from the seats page after the server fetch completes
  setSeats: (seats) => set({ seats, isLoaded: true }),

  // Called by RealtimeProvider when a new allocation is inserted
  // Only updates the one affected seat — no re-fetch of all 56
  markSeatOccupied: (seatId, shift, memberInfo) => {
    set((state) => ({
      seats: state.seats.map((seat) => {
        if (seat.id !== seatId) return seat

        const occupancyData = {
          occupied: true,
          member_id: memberInfo.member_id,
          member_name: memberInfo.member_name || null,
          fee_status: memberInfo.fee_status || null,
          allocation_id: memberInfo.allocation_id || null,
        }

        if (shift === 'fulltime') {
          return { ...seat, morning: occupancyData, evening: occupancyData }
        }

        return { ...seat, [shift]: occupancyData }
      }),
    }))
  },

  // Called by RealtimeProvider when an allocation ends (seat freed)
  markSeatFree: (seatId, shift) => {
    const emptySlot = {
      occupied: false,
      member_id: null,
      member_name: null,
      fee_status: null,
    }

    set((state) => ({
      seats: state.seats.map((seat) => {
        if (seat.id !== seatId) return seat

        if (shift === 'fulltime') {
          return { ...seat, morning: emptySlot, evening: emptySlot }
        }

        return { ...seat, [shift]: emptySlot }
      }),
    }))
  },

  // Get a single seat by ID — used by the bottom sheet
  getSeatById: (id) => get().seats.find((s) => s.id === id) || null,

  // Get all free seats for a given shift — used by the add member seat picker
  getAvailableSeats: (shift) => {
    return get().seats.filter((seat) => {
      if (!seat.is_active) return false
      if (shift === 'morning') return !seat.morning?.occupied
      if (shift === 'evening') return !seat.evening?.occupied
      if (shift === 'fulltime') return !seat.morning?.occupied && !seat.evening?.occupied
      return false
    })
  },
}))

export default useSeatsStore