// components/layout/LogoutButton.jsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { ROUTES } from '@/utils/constants'

export function LogoutButton() {
  const router      = useRouter()
  const clearSession = useAppStore((state) => state.clearSession)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearSession()
    router.replace(ROUTES.LOGIN)
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3.5
                 text-left active:bg-gray-50 touch-manipulation"
    >
      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center
                      justify-center shrink-0">
        <svg className="w-5 h-5 text-danger" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-sm font-medium text-danger">Sign out</span>
    </button>
  )
}