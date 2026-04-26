// app/(app)/settings/seats/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { SeatsManager } from './_components/SeatsManager'
import { ErrorState }   from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function SeatsSettingsPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  // Fetch all seats (including inactive) with current allocation status
  const { data: rawSeats, error: seatsError } = await supabase
    .from('seats')
    .select(`
      id, seat_number, row_label, is_active, created_at,
      seat_allocations( id, is_active, shift, members(name) )
    `)
    .eq('library_id', partnerData.library_id)
    .is('deleted_at', null)
    .order('seat_number', { ascending: true })

  if (seatsError) {
    return <ErrorState message="Could not load seat data." />
  }

  const seats = (rawSeats || []).map((s) => {
    const activeAlloc = (s.seat_allocations || []).find((a) => a.is_active)
    return {
      id:          s.id,
      seat_number: s.seat_number,
      row_label:   s.row_label,
      is_active:   s.is_active,
      created_at:  s.created_at,
      is_occupied: !!activeAlloc,
      occupant:    activeAlloc?.members?.name || null,
      shift:       activeAlloc?.shift || null,
    }
  })

  const activeSeatCount   = seats.filter((s) => s.is_active).length
  const occupiedSeatCount = seats.filter((s) => s.is_occupied).length
  const maxSeatNumber     = seats.length > 0
    ? Math.max(...seats.map((s) => s.seat_number))
    : 0

  return (
    <SeatsManager
      seats={seats}
      isPrimary={partnerData.role === 'primary'}
      activeSeatCount={activeSeatCount}
      occupiedSeatCount={occupiedSeatCount}
      maxSeatNumber={maxSeatNumber}
    />
  )
}