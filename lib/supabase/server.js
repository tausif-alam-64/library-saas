// lib/supabase/server.js

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Returns a Supabase client configured for server use
// This correctly handles cookie reading and writing for auth
// Import this in Server Components, API route handlers, and middleware
// Never import this in client components — use lib/supabase/client.js there
export async function createClient() {
  // In Next.js 15+, cookies() returns a Promise — must be awaited
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components where cookies are read-only
            // The proxy/middleware handles cookie refresh in those cases
          }
        },
      },
    }
  )
}