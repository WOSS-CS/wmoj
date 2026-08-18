import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>

      <Skeleton variant="rounded" className="h-9 w-full" />

      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-24" />
        </div>
        <SkeletonTable rows={20} columns={4} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}