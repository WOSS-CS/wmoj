import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={28} width={192} />
        <Skeleton variant="text" className="mt-2" height={16} width={448} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
          <Skeleton variant="text" height={16} width={160} />
          <Skeleton variant="text" height={14} width={80} />
        </div>
        <div className="px-4 py-2 border-b border-border">
          <Skeleton variant="rounded" height={32} width="100%" />
        </div>
        <SkeletonTable rows={10} columns={7} className="glass-panel overflow-hidden rounded-none border-0" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}