// app/(app)/reports/loading.jsx

export default function ReportsLoading() {
  return (
    <div className="pb-24 animate-pulse">
      {/* Month selector skeleton */}
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-200" />
          <div className="flex-1 h-5 bg-gray-200 rounded" />
          <div className="w-9 h-9 rounded-xl bg-gray-200" />
        </div>
      </div>

      {/* Summary skeleton */}
      <div className="px-4 space-y-3 mb-5">
        <div className="bg-surface rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded-full" />
          <div className="flex justify-between">
            <div className="h-2.5 w-24 bg-gray-100 rounded" />
            <div className="h-2.5 w-24 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-gray-100 p-3 space-y-2">
              <div className="h-2 bg-gray-200 rounded w-full" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Partner breakdown skeleton */}
      <div className="px-4 mb-5">
        <div className="h-2.5 w-36 bg-gray-200 rounded mb-3" />
        <div className="bg-surface rounded-2xl border border-gray-100 p-4 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Unpaid list skeleton */}
      <div className="px-4">
        <div className="h-2.5 w-28 bg-gray-200 rounded mb-3" />
        <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3
                                    border-b border-gray-50">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-2/5" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-12" />
                <div className="h-4 bg-gray-100 rounded-full w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}