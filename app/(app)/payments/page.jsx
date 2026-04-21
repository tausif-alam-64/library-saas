// app/(app)/payments/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { PaymentsClient } from './_components/PaymentsClient'
import { ErrorState }   from '@/components/ui/ErrorState'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('library_id, libraries(name)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

  const libraryId = partnerData.library_id

  // All payments — newest first — with member name and partner name
  const { data: rawPayments, error: paymentsError } = await supabase
    .from('fee_payments')
    .select(`
      id, amount_paid, is_prorated, payment_mode,
      period_start_date, period_end_date, paid_on, notes,
      members ( id, name ),
      partners ( name )
    `)
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (paymentsError) {
    console.error('[PaymentsPage]', paymentsError.message)
    return <ErrorState message="Could not load payment history." />
  }

  const payments = (rawPayments || []).map((p) => ({
    id:                        p.id,
    member_id:                 p.members?.id || null,
    member_name:               p.members?.name || 'Unknown',
    amount_paid:               Number(p.amount_paid),
    is_prorated:               p.is_prorated,
    payment_mode:              p.payment_mode,
    period_start_date:         p.period_start_date,
    period_end_date:           p.period_end_date,
    paid_on:                   p.paid_on,
    notes:                     p.notes,
    collected_by_partner_name: p.partners?.name || 'Unknown',
  }))

  // Summary stats for the header
  const totalCollected = Math.round(
    payments.reduce((sum, p) => sum + p.amount_paid, 0)
  )

  return (
    <PaymentsClient
      initialPayments={payments}
      totalCollected={totalCollected}
    />
  )
}