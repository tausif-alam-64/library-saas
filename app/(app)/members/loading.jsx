// app/(app)/members/loading.jsx

// Matches the real layout exactly — no layout shift when data arrives

export default function MembersLoading() {
  return (
    <div>
      {/* Search bar skeleton */}
      <div className="sticky top-14 z-30 bg-gray-50 px-4 pt-3 pb-2 space-y-2.5">
        <div className="h-11 bg-gray-200 rounded-xl animate-pulse" />
        {/* Filter pills skeleton */}
        <div className="flex gap-2">
          {['All', 'Overdue', 'Grace', 'Paid'].map((label) => (
            <div key={label}
              className="h-8 w-16 bg-gray-200 rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </div>

      {/* Member card skeletons */}
      <div className="bg-white mt-14 border-y border-gray-100 divide-y divide-gray-50">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0"
              style={{ animationDelay: `${i * 60}ms` }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded animate-pulse w-2/5"
                style={{ animationDelay: `${i * 60}ms` }} />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3"
                style={{ animationDelay: `${i * 60}ms` }} />
            </div>
            <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}