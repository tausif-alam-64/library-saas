// app/(app)/dashboard/loading.jsx

export default function DashboardLoading() {
  return (
    <div className="pb-24">
      {/* Date header skeleton */}
      <div className="px-4 pt-4 pb-3">
        <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-1.5" />
      </div>

      {/* Stat cards skeleton — 2x2 */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        {[1,2,3,4].map((i) => (
          <div key={i}
            className="bg-surface rounded-2xl border border-gray-100 p-4 space-y-2"
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-2.5 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Overdue list skeleton */}
      <div className="mx-4 mb-5">
        <div className="h-2.5 w-36 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
          {[1,2,3].map((i) => (
            <div key={i}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-50"
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/5" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="mx-4">
        <div className="h-2.5 w-28 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
          {[1,2,3].map((i) => (
            <div key={i}
              className="flex items-start gap-3 px-4 py-3 border-b border-gray-50"
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}