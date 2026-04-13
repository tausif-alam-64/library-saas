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

    // Prevent double submission
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
        // Supabase returns 'Invalid login credentials' for wrong email/password
        // We show a cleaner message to the user
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid_grant')
        ) {
          setError('Incorrect email or password. Please try again.')
        } else if (signInError.message.includes('network') || signInError.message.includes('fetch')) {
          setError('No internet connection. Please check your network and try again.')
        } else {
          setError('Unable to sign in. Please try again.')
        }
        return
      }

      // Redirect to the page the user was trying to reach
      // or to dashboard as default
      const redirectTo = searchParams.get('redirectTo') || ROUTES.DASHBOARD
      router.replace(redirectTo)
      router.refresh() // Force the layout to re-fetch session data

    } catch (err) {
      console.error('[login] Unexpected error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: '#f9fafb',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
      }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111111',
            margin: '0 0 0.25rem 0',
          }}>
            Library Manager
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0,
          }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} noValidate>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                color: '#b91c1c',
                lineHeight: '1.5',
              }}
            >
              {error}
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.375rem',
              }}
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
              style={{
                display: 'block',
                width: '100%',
                height: '48px',
                padding: '0 0.875rem',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#111111',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#111111'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.375rem',
            }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setError('Please contact your administrator to reset your password.')}
                style={{
                  fontSize: '0.8125rem',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  minHeight: 'auto',
                  minWidth: 'auto',
                }}
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
              style={{
                display: 'block',
                width: '100%',
                height: '48px',
                padding: '0 0.875rem',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#111111',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#111111'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '48px',
              background: isLoading || !email || !password ? '#9ca3af' : '#111111',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: '500',
              cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              gap: '0.5rem',
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}