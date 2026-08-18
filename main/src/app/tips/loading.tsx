import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-8">
      <div>
        <Skeleton variant="text" width={80} height={24} />
        <Skeleton variant="text" width={280} height={14} className="mt-1" />
        <div className="mt-3">
          <Skeleton variant="rectangular" width="100%" height={1} />
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-panel p-6 space-y-3">
          <Skeleton variant="text" width={i === 0 ? 280 : 220} height={18} />
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="92%" height={14} />
            <Skeleton variant="text" width="85%" height={14} />
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}