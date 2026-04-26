// lib/getPartnerData.js
// React's cache() deduplicates this function call within a single server request.
// If layout.jsx and dashboard/page.jsx both call getPartnerData(),
// only one database round-trip happens. The second call returns memory instantly.
// This is 100% request-scoped — it NEVER leaks between users or requests.

import { cache }        from 'react'
import { createClient } from '@/lib/supabase/server'

export const getPartnerData = cache(async () => {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data: partnerData, error } = await supabase
    .from('partners')
    .select(`
      id, name, role, library_id,
      libraries (
        id, name, address, phone,
        morning_cutoff_time, grace_period_days,
        no_show_days, plan, plan_expires_at
      )
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (error || !partnerData) return null
  return partnerData
})