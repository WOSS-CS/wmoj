import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="max-w-4xl mx-auto space-y-6">
      <Skeleton variant="text" width={140} height={14} />

      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rounded" width={70} height={22} />
        <Skeleton variant="rounded" width={60} height={22} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* About */}
        <div className="md:col-span-2">
          <div className="glass-panel p-6 space-y-4">
            <Skeleton variant="text" width="50%" height={14} />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="text"
                  width={i === 5 ? '60%' : '100%'}
                  height={14}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="glass-panel p-5 space-y-5">
            <div className="space-y-2">
              <Skeleton variant="text" width="50%" height={12} />
              <Skeleton variant="text" width={80} height={28} />
            </div>
            <Skeleton variant="rounded" width="100%" height={40} />
            <Skeleton variant="text" width="100%" height={12} />
          </div>
        </div>
      </div>

      {/* Problems (virtual) */}
      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 border-b border-border space-y-1">
          <Skeleton variant="text" width={90} height={16} />
          <Skeleton variant="text" width="60%" height={12} />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <Skeleton variant="text" width="45%" height={16} />
              <div className="flex items-center gap-3">
                <Skeleton variant="text" width={50} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}