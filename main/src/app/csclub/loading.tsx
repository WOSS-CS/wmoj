import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <Skeleton variant="rounded" width={128} height={128} />
        <Skeleton variant="text" width={360} height={24} />
        <Skeleton variant="text" width={280} height={14} />
        <div className="w-full">
          <Skeleton variant="rectangular" width="100%" height={1} />
        </div>
      </div>

      {/* Intro paragraph */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="95%" height={14} />
        <Skeleton variant="text" width="80%" height={14} />
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-panel p-6 space-y-3">
          <Skeleton variant="text" width={i === 0 ? 180 : 200} height={18} />
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="92%" height={14} />
            <Skeleton variant="text" width="85%" height={14} />
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}