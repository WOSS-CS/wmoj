import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-5xl mx-auto space-y-6">
      <Skeleton variant="text" width={160} height={24} />

      <div className="flex items-center justify-between gap-4">
        <Skeleton variant="text" width={200} height={20} />
        <Skeleton variant="rounded" width="25%" height={32} />
      </div>

      <SkeletonTable rows={25} columns={4} className="rounded-none border-0" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}