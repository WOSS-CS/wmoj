import { Skeleton, SkeletonForm } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={28} width={192} />
        <Skeleton variant="text" className="mt-2" height={16} width={448} />
      </div>

      <div className="max-w-4xl space-y-5">
        <SkeletonForm fields={6} />
        <div className="space-y-2">
          <Skeleton variant="text" height={14} width="30%" />
          <Skeleton variant="rounded" height={120} width="100%" />
        </div>
        <div className="flex gap-3">
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}