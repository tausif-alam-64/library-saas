// app/(app)/payments/loading.jsx

export default function PaymentsLoading() {
  return (
    <div className="pb-24 animate-pulse">
      {/* Header skeleton */}
      <div className="px-4 pt-4 pb-3">
        <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
        <div className="h-7 w-28 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>

      {/* Search skeleton */}
      <div className="px-4 pb-3">
        <div className="h-11 bg-gray-200 rounded-xl" />
      </div>

      {/* Month groups */}
      {[1, 2].map((g) => (
        <div key={g} className="mb-4">
          <div className="flex justify-between px-4 py-2">
            <div className="h-2.5 w-20 bg-gray-200 rounded" />
            <div className="h-2.5 w-14 bg-gray-200 rounded" />
          </div>
          <div className="bg-white border-y border-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}
                className="flex items-start gap-3 px-4 py-3.5
                           border-b border-gray-50 last:border-b-0"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-2/5" />
                  <div className="h-3 bg-gray-100 rounded w-3/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3.5 w-12 bg-gray-200 rounded" />
                  <div className="h-4 w-10 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}