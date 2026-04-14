// app/(app)/seats/loading.jsx

export default function SeatsLoading() {
  return (
    <div className="px-4 pt-4">
      {/* Legend skeleton */}
      <div className="flex gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 animate-pulse" />
            <div className="w-10 h-3 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Grid skeleton — same 7 columns as real grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 56 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-100 animate-pulse"
            style={{
              // Staggered animation delay makes it look more natural
              animationDelay: `${(i % 7) * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}