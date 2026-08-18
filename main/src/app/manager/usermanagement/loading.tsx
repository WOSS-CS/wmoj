import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Skeleton variant="rounded" className="h-9 flex-1" />
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" className="h-9 w-20" />
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-24" />
        </div>
        <SkeletonTable rows={20} columns={6} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}