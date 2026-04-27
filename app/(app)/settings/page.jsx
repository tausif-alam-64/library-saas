// app/(app)/settings/page.jsx

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES, ROLES } from '@/utils/constants'
import { LibrarySettingsForm } from './_components/LibrarySettingsForm'
import { ErrorState } from '@/components/ui/ErrorState'
import Link from 'next/link'
import { getPartnerData } from '@/lib/getPartnerData'
import { LogoutButton } from '@/components/layout/LogoutButton'

export default async function SettingsPage() {

  const partnerData = await getPartnerData()

  if (!partnerData) redirect(ROUTES.LOGIN)

  const isPrimary = partnerData.role === ROLES.PRIMARY
  const library   = partnerData.libraries

  if (!library) {
    return <ErrorState message="Library data not found." />
  }

  return (
    <div className="pb-24">
      {/* Library info header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-primary">{library.name}</h1>
        <p className="text-xs text-muted mt-0.5">{library.address}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase
            ${library.plan === 'pro'
              ? 'bg-purple-100 text-purple-800'
              : library.plan === 'basic'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
            {library.plan} plan
          </span>
          <span className="text-[10px] text-muted">
            Logged in as {partnerData.name} ({partnerData.role})
          </span>
        </div>
      </div>

      {/* Sub-settings navigation — all partners can view, primary can modify */}
      <div className="mt-2 bg-white border-y border-gray-100">
        {[
          {
            href:  ROUTES.SETTINGS_PARTNERS,
            label: 'Manage partners',
            sub:   'Add or update partner accounts',
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            href:  ROUTES.SETTINGS_SEATS,
            label: 'Manage seats',
            sub:   'Add seats or mark as inactive',
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"
                  stroke="currentColor" strokeWidth="2"/>
                <path d="M2 11a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3z"
                  stroke="currentColor" strokeWidth="2"/>
                <path d="M6 16v3M18 16v3" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            href:  ROUTES.SETTINGS_FEES,
            label: 'Fee structure',
            sub:   'Update monthly fees — changes apply from effective date',
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                  stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12h8M12 8v8" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ),
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 px-4 py-4 border-b border-gray-50
                       last:border-b-0 active:bg-gray-50 touch-manipulation no-underline"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center
                            justify-center text-gray-600 shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{item.label}</p>
              <p className="text-xs text-muted mt-0.5">{item.sub}</p>
            </div>
            {isPrimary ? (
              <svg className="w-4 h-4 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <span className="text-[10px] text-muted shrink-0">view only</span>
            )}
          </Link>
        ))}
      </div>

      {/* Library settings form — primary only editable */}
      <div className="mt-2">
        <LibrarySettingsForm library={library} isPrimary={isPrimary} />
      </div>
      <div className="mt-2 bg-white border-y border-gray-100">
         <LogoutButton />
      </div>
    </div>
  )
}