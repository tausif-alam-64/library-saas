// app/(app)/members/new/loading.jsx
export default function NewMemberLoading() {
  return (
    <div className="animate-pulse pb-24">
      {/* Step indicator skeleton */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {[1,2,3].map((i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
            {i < 3 && <div className="flex-1 h-0.5 bg-gray-100 rounded-full" />}
          </div>
        ))}
      </div>

      {/* Form skeleton */}
      <div className="px-4 pt-5 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {[1,2,3,4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-11 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}