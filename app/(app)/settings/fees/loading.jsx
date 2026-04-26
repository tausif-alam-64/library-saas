// app/(app)/settings/fees/loading.jsx
export default function FeesSettingsLoading() {
  return (
    <div className="animate-pulse pb-24">
      <div className="px-4 pt-4 pb-2">
        <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[1,2,3].map((i) => (
            <div key={i}
              className="flex items-center justify-between px-4 py-3.5
                         border-b border-gray-50 last:border-b-0">
              <div className="h-3.5 bg-gray-200 rounded w-28" />
              <div className="h-3.5 bg-gray-200 rounded w-20" />
            </div>
          ))}
          <div className="px-4 py-2 bg-gray-50">
            <div className="h-2.5 bg-gray-200 rounded w-40" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}