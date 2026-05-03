// providers/RealtimeProvider.jsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSeatsStore from '@/stores/useSeatsStore'
import useAppStore from '@/stores/useAppStore'

export function RealtimeProvider({ children }) {
  const library                       = useAppStore((state) => state.library)
  const { markSeatOccupied, markSeatFree } = useSeatsStore()

  useEffect(() => {
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
          event:  'INSERT',
          schema: 'public',
          table:  'seat_allocations',
          filter: `library_id=eq.${library.id}`,
        },
        async (payload) => {
          // Fetch member name to show in bottom sheet
          // The payload only has member_id — not the name
          let memberName = null
          try {
            const { data } = await supabase
              .from('members')
              .select('name')
              .eq('id', payload.new.member_id)
              .single()
            memberName = data?.name || null
          } catch {
            // Non-critical — seat will still show as occupied (red)
            // Name appears on next full page load
          }

          markSeatOccupied(payload.new.seat_id, payload.new.shift, {
            member_id:   payload.new.member_id,
            member_name: memberName,
            fee_status:  null, // Cannot compute without payment data
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'seat_allocations',
          filter: `library_id=eq.${library.id}`,
        },
        (payload) => {
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

    return () => { supabase.removeChannel(channel) }
  }, [library?.id, markSeatOccupied, markSeatFree])

  return children
}