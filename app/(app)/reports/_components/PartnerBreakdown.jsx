// app/(app)/reports/_components/PartnerBreakdown.jsx

import { PartnerCollectionSummary } from '@/components/reports/PartnerCollectionSummary'

// partners — [{ id, name, collected, payment_count }]
// total    — total collected

export function PartnerBreakdown({ partners, total }) {
  if (!partners || partners.length === 0) return null

  return (
    <div className="px-4">
      <h2 className="text-base font-medium 
                     text-muted mb-3">
        Collected by partner
      </h2>
      <div className="bg-surface rounded-2xl border border-gray-100 p-4">
        <PartnerCollectionSummary partners={partners} total={total} />
      </div>
    </div>
  )
}