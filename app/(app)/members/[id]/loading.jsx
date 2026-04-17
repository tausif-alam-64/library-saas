// app/(app)/members/[id]/loading.jsx

export default function MemberProfileLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-2/5" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-100 rounded-full w-16" />
              <div className="h-6 bg-gray-100 rounded-full w-20" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </div>

      {/* Fee section skeleton */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 mt-2">
        <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>

      {/* Payment history skeleton */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-28 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-3.5 border-b border-gray-50">
            <div className="w-11 h-11 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}