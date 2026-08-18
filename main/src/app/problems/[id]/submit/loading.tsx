import { Skeleton, SkeletonCodeEditor } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-[1400px] mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Skeleton variant="text" width={60} height={14} />
        <Skeleton variant="text" width={10} height={14} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>

      {/* Editor + Action panel */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Editor */}
        <div className="glass-panel overflow-hidden p-0">
          <SkeletonCodeEditor lines={20} className="border-0 rounded-none" />
        </div>

        {/* Action panel */}
        <div className="glass-panel p-5 sticky top-20 space-y-4">
          <div className="space-y-2">
            <Skeleton variant="text" width="30%" height={12} />
            <Skeleton variant="rounded" width="100%" height={36} />
          </div>
          <Skeleton variant="rounded" width="100%" height={40} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}