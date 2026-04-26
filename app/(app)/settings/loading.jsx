// app/(app)/settings/loading.jsx
export default function SettingsLoading() {
  return (
    <div className="animate-pulse pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="h-5 w-40 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-56 bg-gray-100 rounded mb-2" />
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* Nav items */}
      <div className="mt-2 bg-white border-y border-gray-100">
        {[1,2,3].map((i) => (
          <div key={i}
            className="flex items-center gap-4 px-4 py-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="mt-2 bg-white px-4 py-4 border-y border-gray-100 space-y-4">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-11 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}