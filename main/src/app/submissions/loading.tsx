import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-6xl mx-auto space-y-6">
      <Skeleton variant="text" width={160} height={24} />

      {/* Search bar */}
      <Skeleton variant="rounded" width="100%" height={36} />

      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <Skeleton variant="text" width="100%" height={20} />
        </div>
        <SkeletonTable rows={20} columns={3} className="rounded-none border-0" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}