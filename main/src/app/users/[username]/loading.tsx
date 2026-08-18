import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-5xl mx-auto space-y-6">
      <Skeleton variant="text" width={200} height={24} />

      <div className="flex gap-6 items-start">
        {/* Left sidebar */}
        <div className="w-48 flex-shrink-0 space-y-4">
          <div className="glass-panel p-4 flex flex-col items-center">
            <Skeleton variant="rounded" width={128} height={128} />
          </div>
          <div className="glass-panel p-4 space-y-3">
            <Skeleton variant="text" width="80%" height={14} />
            <Skeleton variant="text" width="70%" height={14} />
            <Skeleton variant="text" width="60%" height={14} />
            <div className="border-t border-border" />
            <Skeleton variant="text" width="80%" height={14} />
            <Skeleton variant="text" width="60%" height={12} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="glass-panel p-6 space-y-4">
            <Skeleton variant="text" width={80} height={20} />
            <div className="space-y-2">
              <Skeleton variant="text" width="100%" height={14} />
              <Skeleton variant="text" width="90%" height={14} />
              <Skeleton variant="text" width="70%" height={14} />
            </div>
          </div>

          {/* Heatmap placeholder */}
          <div className="glass-panel p-6 space-y-4">
            <Skeleton variant="text" width={140} height={18} />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex gap-1">
                  {Array.from({ length: 26 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      variant="rounded"
                      width={11}
                      height={11}
                      className="flex-shrink-0"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}