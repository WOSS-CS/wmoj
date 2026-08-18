import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={28} width={192} />
        <Skeleton variant="text" className="mt-2" height={16} width={384} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Skeleton variant="rounded" className="flex-1" height={36} width="100%" />
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={72} height={36} />
          ))}
        </div>
      </div>

      <SkeletonTable rows={10} columns={5} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}