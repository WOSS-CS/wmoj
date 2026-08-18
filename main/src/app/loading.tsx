import { Skeleton, SkeletonCard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col lg:flex-row gap-6">
      {/* Left Column: News */}
      <div className="flex-[3] min-w-0">
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-6 py-4 border-b border-border">
            <Skeleton variant="text" width={80} height={20} />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 space-y-3">
                <Skeleton variant="text" width="60%" height={22} />
                <Skeleton variant="text" width="40%" height={12} />
                <div className="space-y-2 pt-2">
                  <Skeleton variant="text" width="100%" height={12} />
                  <Skeleton variant="text" width="100%" height={12} />
                  <Skeleton variant="text" width="70%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="flex-1 min-w-0 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}