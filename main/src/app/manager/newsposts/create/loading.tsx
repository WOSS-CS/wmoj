import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>

      <div className="space-y-5 max-w-4xl">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton variant="rounded" className="h-10 w-full" />
        </div>

        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton variant="rounded" className="h-[500px] w-full" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}