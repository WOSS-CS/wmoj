import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <Skeleton variant="text" width={200} height={28} />

      {/* Intro paragraph */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="90%" height={14} />
        <Skeleton variant="text" width="75%" height={14} />
      </div>

      {/* Formula block */}
      <div className="glass-panel p-6 flex justify-center">
        <Skeleton variant="rectangular" width={320} height={48} />
      </div>

      {/* Section: weighted problem score */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width={240} height={18} />
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="95%" height={14} />
          <Skeleton variant="text" width="85%" height={14} />
          <Skeleton variant="text" width="90%" height={14} />
        </div>
      </div>

      {/* Section: breadth bonus */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width={180} height={18} />
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="92%" height={14} />
          <Skeleton variant="text" width="80%" height={14} />
        </div>
      </div>

      {/* Section: key behaviours */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width={220} height={18} />
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="88%" height={14} />
          <Skeleton variant="text" width="95%" height={14} />
          <Skeleton variant="text" width="72%" height={14} />
        </div>
      </div>

      {/* Reference table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-3 border-b border-border flex gap-4">
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="text" width="40%" height={14} />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-3 flex gap-4">
              <Skeleton variant="text" width="40%" height={14} />
              <Skeleton variant="text" width="40%" height={14} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}