// components/ui/PhoneLink.jsx

// Renders a phone number as a tappable tel: link on mobile
// On desktop it shows the formatted number as plain text
// Critical for the librarian — one tap to call any member from their profile
// formatPhone imported from our formatters utility

import { formatPhone } from '@/utils/formatters'

export function PhoneLink({ phone, className = '' }) {
  if (!phone) return <span className="text-gray-400">—</span>

  return (
    <a
      href={`tel:${phone}`}
      className={`text-blue-600 underline underline-offset-2
                  active:text-blue-800 touch-manipulation ${className}`}
    >
      {formatPhone(phone)}
    </a>
  )
}