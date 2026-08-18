import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl mx-auto space-y-6">
      <Skeleton variant="text" width={180} height={24} />

      {/* Avatar section */}
      <div className="glass-panel p-6">
        <Skeleton variant="text" width={140} height={16} className="mb-4" />
        <div className="flex items-center gap-5">
          <Skeleton variant="rounded" width={96} height={96} />
          <div className="space-y-2">
            <Skeleton variant="text" width={220} height={14} />
            <Skeleton variant="text" width={160} height={12} />
          </div>
        </div>
      </div>

      {/* About Me editor */}
      <div className="glass-panel p-6 space-y-3">
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="rounded" width="100%" height={300} />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Skeleton variant="rounded" width={130} height={40} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}