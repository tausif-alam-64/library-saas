// lib/supabaseAdmin.js
// CRITICAL: This file must NEVER be imported in client components or hooks.
// It uses the service role key which has full database access bypassing RLS.
// Only import this in API route handlers (app/api/**) for admin operations.

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}