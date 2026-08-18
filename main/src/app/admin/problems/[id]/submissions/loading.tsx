import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={16} width={160} />
        <Skeleton variant="text" className="mt-2" height={28} width={320} />
        <Skeleton variant="text" className="mt-1" height={16} width={384} />
      </div>

      <SkeletonTable rows={10} columns={6} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}