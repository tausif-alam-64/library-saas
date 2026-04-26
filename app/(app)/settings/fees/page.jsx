// app/(app)/settings/fees/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { FeeManager }   from './_components/FeeManager'
import { ErrorState }   from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function FeesSettingsPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const { data: structures, error: feesError } = await supabase
    .from('fee_structures')
    .select('id, morning_fee, evening_fee, fulltime_fee, valid_from, valid_until, created_at')
    .eq('library_id', partnerData.library_id)
    .order('valid_from', { ascending: false })

  if (feesError) {
    return <ErrorState message="Could not load fee data." />
  }

  const current = (structures || []).find((s) => s.valid_until === null)
  const history = (structures || []).filter((s) => s.valid_until !== null)

  return (
    <FeeManager
      current={current || null}
      history={history}
      isPrimary={partnerData.role === 'primary'}
    />
  )
}