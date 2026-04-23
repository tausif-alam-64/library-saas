// app/(app)/settings/partners/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES }       from '@/utils/constants'
import { PartnersManager } from './_components/PartnersManager'
import { ErrorState }   from '@/components/ui/ErrorState'

export default async function PartnersSettingsPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect(ROUTES.LOGIN)

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('id, role, library_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (partnerError || !partnerData) redirect(ROUTES.LOGIN)

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