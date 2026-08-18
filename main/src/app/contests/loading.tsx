import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="text" width={240} height={14} className="mt-1" />
      </div>

      {/* Ongoing section */}
      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton variant="text" width={90} height={16} />
        </div>
        <SkeletonTable rows={3} columns={4} className="rounded-none border-0" />
      </div>

      {/* Upcoming section */}
      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton variant="text" width={100} height={16} />
        </div>
        <SkeletonTable rows={2} columns={4} className="rounded-none border-0" />
      </div>

      {/* Past section */}
      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton variant="text" width={110} height={16} />
        </div>
        <div className="px-4 py-2 border-b border-border">
          <Skeleton variant="text" width="100%" height={20} />
        </div>
        <SkeletonTable rows={10} columns={4} className="rounded-none border-0" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}