// app/(app)/members/[id]/pay/loading.jsx
export default function PayLoading() {
  return (
    <div className="animate-pulse pb-36">
      {/* Member banner */}
      <div className="mx-4 mt-5 h-16 bg-gray-200 rounded-2xl" />

      <div className="px-4 mt-5 space-y-5">
        {/* Amount */}
        <div className="space-y-1.5">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-11 bg-gray-200 rounded-xl" />
        </div>
        {/* Mode buttons */}
        <div className="flex gap-3">
          <div className="flex-1 h-14 bg-gray-200 rounded-2xl" />
          <div className="flex-1 h-14 bg-gray-200 rounded-2xl" />
        </div>
        {/* Period */}
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="flex gap-3">
            <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
            <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
          </div>
        </div>
        {/* Partners */}
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}