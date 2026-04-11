// lib/supabase/client.js

import { createBrowserClient } from '@supabase/ssr'

// Returns a Supabase client configured for browser use
// This respects RLS — every query runs as the logged-in partner
// Import this in 'use client' components and hooks
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}