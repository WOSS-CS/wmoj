import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-6">
      <div>
        <Skeleton variant="text" width={80} height={24} />
        <div className="mt-3">
          <Skeleton variant="rectangular" width="100%" height={1} />
        </div>
      </div>

      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="95%" height={14} />
        <Skeleton variant="text" width="88%" height={14} />
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="80%" height={14} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}