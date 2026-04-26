// app/(app)/settings/seats/loading.jsx
export default function SeatsSettingsLoading() {
  return (
    <div className="animate-pulse pb-24">
      {/* Summary cards */}
      <div className="flex gap-3 px-4 pt-4 pb-3">
        {[1,2,3].map((i) => (
          <div key={i} className="flex-1 bg-white rounded-xl border border-gray-100 p-3">
            <div className="h-7 bg-gray-200 rounded mb-1 mx-auto w-8" />
            <div className="h-2.5 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>

      <div className="px-4 mb-3">
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>

      <div className="bg-white border-y border-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}