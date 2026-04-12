// providers/QueryProvider.jsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }) {
  // useState ensures a new QueryClient is only created once per component mount
  // If we used a module-level constant, the same client would be shared across
  // different users' server renders — a security issue in server environments
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 1 minute before being considered stale
            staleTime: 60 * 1000,
            // Do not refetch when the user switches browser tabs
            // The librarian's tab stays open all day — no unnecessary requests
            refetchOnWindowFocus: false,
            // Retry failed requests twice before showing an error
            retry: 2,
            // Wait 1 second before first retry, 2 seconds before second
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
          mutations: {
            // Do not retry mutations — a payment or member creation
            // failing once should not be retried automatically
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}