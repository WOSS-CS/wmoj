import { Skeleton, SkeletonCard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={32} width={320} />
        <Skeleton variant="text" className="mt-1" height={20} width={256} />
      </div>

      <div className="glass-panel p-4">
        <Skeleton variant="text" height={14} width={96} />
        <div className="space-y-2 mt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={16} width={240} />
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}