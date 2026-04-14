// app/(auth)/login/page.jsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/utils/constants'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    if (isLoading) return

    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid_grant')
        ) {
          setError('Incorrect email or password. Please try again.')
        } else if (
          signInError.message.includes('network') ||
          signInError.message.includes('fetch')
        ) {
          setError('No internet connection. Please check your network.')
        } else {
          setError('Unable to sign in. Please try again.')
        }
        return
      }

      const redirectTo = searchParams.get('redirectTo') || ROUTES.DASHBOARD
      // router.replace is enough — no need for router.refresh() here
      router.replace(redirectTo)

    } catch (err) {
      console.error('[login] Unexpected error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // overflow-y-auto — page scrolls when keyboard appears on mobile
    // This ensures the submit button is always reachable
    <div className="min-h-screen overflow-y-auto flex flex-col
                    items-center justify-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Library Manager
          </h1>
          <p className="text-sm text-gray-500">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} noValidate>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 mb-5
                         bg-red-50 border border-red-200 rounded-lg"
            >
              <svg
                className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4m0 4h.01" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-red-700 leading-snug">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full h-12 px-3.5 bg-white border border-gray-300
                         rounded-lg text-base text-gray-900 outline-none
                         focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                         disabled:bg-gray-50 disabled:text-gray-400
                         transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  setError(
                    'Please contact your administrator to reset your password.'
                  )
                }
                className="text-xs text-gray-400 hover:text-gray-600
                           transition-colors min-h-0 min-w-0"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full h-12 px-3.5 bg-white border border-gray-300
                         rounded-lg text-base text-gray-900 outline-none
                         focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                         disabled:bg-gray-50 disabled:text-gray-400
                         transition-colors"
            />
          </div>

          {/* Submit button
              Only disabled during loading — NOT on empty state
              Mobile autofill does not fire onChange so React state
              can be empty even when the input visually shows text */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-2
                       bg-gray-900 text-white rounded-lg
                       text-[0.9375rem] font-medium
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12" cy="12" r="10"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                  />
                  <path
                    d="M12 2a10 10 0 0110 10"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

        </form>
      </div>
    </div>
  )
}