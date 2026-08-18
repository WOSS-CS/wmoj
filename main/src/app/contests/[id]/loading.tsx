import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-5xl mx-auto space-y-6">
      <Skeleton variant="text" width={140} height={14} />

      {/* Contest header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="text" width="50%" height={24} />
            <Skeleton variant="rounded" width={60} height={22} />
          </div>
          <div className="glass-panel p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                width={i === 4 ? '60%' : '100%'}
                height={14}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton variant="rounded" width={90} height={28} />
            <Skeleton variant="rounded" width={110} height={28} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton variant="rounded" width={110} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
        </div>
      </div>

      {/* Problems */}
      <div className="space-y-4">
        <Skeleton variant="text" width={180} height={20} />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 flex items-center justify-between">
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="text" width={60} height={12} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}