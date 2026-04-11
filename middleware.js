// middleware.js
// This file must be at the project root — same level as package.json

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Create a response object that we can modify (to refresh cookies)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client that can read and write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Update the request and response cookies simultaneously
          // This is required for the auth session to refresh correctly
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh the session — this also handles token expiry automatically
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname.startsWith('/login')

  // Not logged in and trying to reach a protected page
  if (!session && !isLoginPage) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the attempted URL so we can redirect back after login
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in and trying to reach the login page
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Define which paths the middleware runs on
// Exclude static files, images, and the root path
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}