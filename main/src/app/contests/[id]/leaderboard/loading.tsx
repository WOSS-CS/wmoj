import { Skeleton, SkeletonLeaderboard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-6">
      <Skeleton variant="text" width={140} height={14} />

      <div>
        <Skeleton variant="text" width="50%" height={24} />
        <Skeleton variant="text" width={160} height={14} className="mt-1" />
      </div>

      <div className="glass-panel p-5">
        <SkeletonLeaderboard items={10} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}