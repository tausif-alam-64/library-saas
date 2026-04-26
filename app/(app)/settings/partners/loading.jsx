// app/(app)/settings/partners/loading.jsx
export default function PartnersSettingsLoading() {
  return (
    <div className="animate-pulse pb-24">
      <div className="mt-2 bg-white border-y border-gray-100">
        {[1,2,3].map((i) => (
          <div key={i}
            className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-1/3" />
              <div className="h-5 bg-gray-100 rounded-full w-16" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
              <div className="h-8 w-20 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 mt-4">
        <div className="h-12 bg-gray-200 rounded-xl border-2 border-dashed border-gray-300" />
      </div>
    </div>
  )
}