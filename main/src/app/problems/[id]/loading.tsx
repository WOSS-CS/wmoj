import { Skeleton, SkeletonCard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-6xl mx-auto space-y-6">
      <Skeleton variant="text" width={120} height={14} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 space-y-4">
            <Skeleton variant="text" width="50%" height={22} />
            <div className="min-h-[400px] space-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="text"
                  width={i % 3 === 0 ? '100%' : i % 3 === 1 ? '85%' : '60%'}
                  height={14}
                />
              ))}
            </div>
          </div>
          <SkeletonCard lines={4} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-5 sticky top-20 space-y-3">
            <Skeleton variant="text" width="60%" height={16} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton variant="text" width="40%" height={14} />
                <Skeleton variant="text" width={60} height={14} />
              </div>
            ))}
            <div className="pt-3 border-t border-border space-y-2">
              <Skeleton variant="rounded" width="100%" height={36} />
              <Skeleton variant="rounded" width="100%" height={36} />
              <Skeleton variant="rounded" width="100%" height={36} />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}