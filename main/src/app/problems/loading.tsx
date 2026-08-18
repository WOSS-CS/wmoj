import { Skeleton, SkeletonTable, SkeletonCard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <Skeleton variant="text" width={220} height={24} />
        <Skeleton variant="text" width={280} height={14} className="mt-1" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Problem List */}
        <div className="flex-[3] min-w-0">
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <Skeleton variant="text" width={100} height={16} />
            </div>
            <div className="px-4 py-2 border-b border-border">
              <Skeleton variant="text" width="100%" height={20} />
            </div>
            <SkeletonTable rows={10} columns={4} className="rounded-none border-0" />
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <Skeleton variant="text" width={120} height={16} />
            </div>
            <div className="p-4 bg-surface-1">
              <Skeleton variant="rounded" width="100%" height={36} />
            </div>
          </div>
          <SkeletonCard lines={5} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}