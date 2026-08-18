import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton variant="text" height={28} width={192} />
          <Skeleton variant="text" className="mt-2" height={16} width={384} />
        </div>
        <Skeleton variant="rounded" width={140} height={28} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Skeleton variant="rounded" className="flex-1" height={36} width="100%" />
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={72} height={36} />
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border">
          <Skeleton variant="text" height={16} width={120} />
        </div>
        <div className="px-4 py-2 border-b border-border">
          <Skeleton variant="rounded" height={32} width="100%" />
        </div>
        <SkeletonTable rows={10} columns={5} className="glass-panel overflow-hidden rounded-none border-0" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}