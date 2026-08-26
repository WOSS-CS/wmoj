import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={32} width={420} />
        <Skeleton variant="text" className="mt-2" height={20} width={280} />
      </div>

      <div className="glass-panel p-4 space-y-2">
        <Skeleton variant="text" height={12} width={120} />
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={14} width="60%" />
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton variant="text" height={20} width="40%" />
            <Skeleton variant="text" height={14} width="100%" />
            <Skeleton variant="text" height={14} width="85%" />
            <Skeleton variant="text" height={14} width="70%" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}