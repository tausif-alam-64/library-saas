// app/(app)/members/[id]/_components/MemberHeader.jsx

import { PhoneLink } from '@/components/ui/PhoneLink'
import { formatDate, formatShift } from '@/utils/formatters'
import Image from 'next/image'

export function MemberHeader({ member, currentAllocation }) {
  const initials = member.name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
      <div className="flex items-start gap-4">

        {/* Avatar — photo if available, initials otherwise */}
        <div className="shrink-0">
          {member.photo_url ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden">
              <Image
                src={member.photo_url}
                alt={`Photo of ${member.name}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center
                            justify-center text-xl font-bold text-white">
              {initials}
            </div>
          )}
        </div>

        {/* Identity info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {member.name}
          </h1>

          {/* Seat + shift badge */}
          {currentAllocation ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-medium
                               px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3M2 11a2 2 0 012-2h16
                           a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3z"
                    stroke="currentColor" strokeWidth="2"/>
                  <path d="M6 16v2M18 16v2" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Seat {currentAllocation.seat_number}
              </span>
              <span className="text-xs font-medium px-2 py-1 bg-gray-100
                               text-gray-700 rounded-full">
                {formatShift(currentAllocation.shift)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">No seat assigned</p>
          )}

          {/* Phone — tappable */}
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07
                       19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0
                       014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0
                       01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0
                       012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <PhoneLink phone={member.phone} className="text-sm" />
          </div>

          {/* Join date */}
          <p className="text-xs text-gray-400 mt-1">
            Member since {formatDate(member.join_date)}
          </p>
        </div>
      </div>

      {/* Inactive banner */}
      {member.status === 'inactive' && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2
                        bg-gray-100 rounded-lg">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-sm text-gray-500 font-medium">
            This member is inactive
          </p>
        </div>
      )}
    </div>
  )
}