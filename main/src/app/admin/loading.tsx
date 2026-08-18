import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={28} width={192} />
        <Skeleton variant="text" className="mt-2" height={16} width={384} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      <SkeletonTable rows={8} columns={6} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}