// providers/RealtimeProvider.jsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSeatsStore from '@/stores/useSeatsStore'
import useAppStore from '@/stores/useAppStore'

export function RealtimeProvider({ children }) {
  const library = useAppStore((state) => state.library)
  const { markSeatOccupied, markSeatFree } = useSeatsStore()

  useEffect(() => {
    // Do not subscribe until we know which library this partner belongs to
    if (!library?.id) return

    const supabase = createClient()

    // One named channel per library
    // If this component re-renders, the channel name stays the same
    // so Supabase will reuse the existing connection instead of creating a new one
    const channel = supabase
      .channel(`realtime-library-${library.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seat_allocations',
          filter: `library_id=eq.${library.id}`,
        },
        (payload) => {
          // A new seat was assigned — update only that seat in Zustand
          // This does NOT re-fetch all 56 seats — it updates one cell
          markSeatOccupied(payload.new.seat_id, payload.new.shift, {
            member_id: payload.new.member_id,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seat_allocations',
          filter: `library_id=eq.${library.id}`,
        },
        (payload) => {
          // An allocation was ended (is_active flipped to false) — free the seat
          if (payload.new.is_active === false && payload.old.is_active === true) {
            markSeatFree(payload.new.seat_id, payload.new.shift)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[realtime] Subscribed to library ${library.id}`)
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[realtime] Channel error — will attempt to reconnect')
        }
      })

    // Cleanup when component unmounts (logout) or library changes
    return () => {
      supabase.removeChannel(channel)
    }
  }, [library?.id]) // Only re-run if library ID changes

  return children
}