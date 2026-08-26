import { Skeleton, SkeletonProfile, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton variant="rounded" className="h-5 w-5" />
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="glass-panel p-5">
        <SkeletonProfile showStats={false} showBio={false} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel p-4 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="px-4 py-2 border-b border-border">
            <Skeleton variant="rounded" className="h-8 w-full" />
          </div>
          <SkeletonTable rows={10} columns={6} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}