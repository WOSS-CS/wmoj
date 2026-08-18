import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-6">
      <div>
        <Skeleton variant="text" width={160} height={24} />
        <Skeleton variant="text" width={240} height={14} className="mt-1" />
        <div className="mt-3">
          <Skeleton variant="rectangular" width="100%" height={1} />
        </div>
      </div>

      <SkeletonTable rows={1} columns={3} className="rounded-none border-0" />

      <Skeleton variant="text" width={180} height={12} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}