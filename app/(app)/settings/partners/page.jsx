// app/(app)/settings/partners/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { PartnersManager } from './_components/PartnersManager'
import { ErrorState }   from '@/components/ui/ErrorState'
import { getPartnerData } from '@/lib/getPartnerData'

export default async function PartnersSettingsPage() {
  const supabase = await createClient()

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('id, name, phone, role, is_active, created_at')
    .eq('library_id', partnerData.library_id)
    .is('deleted_at', null)
    .order('role', { ascending: false })
    .order('created_at', { ascending: true })

  if (partnersError) {
    return <ErrorState message="Could not load partners." />
  }

  return (
    <PartnersManager
      partners={partners || []}
      currentPartnerId={partnerData.id}
      isPrimary={partnerData.role === 'primary'}
    />
  )
}