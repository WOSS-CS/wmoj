import { Skeleton, SkeletonForm, SkeletonCodeEditor } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
      <div>
        <Skeleton variant="text" height={28} width={192} />
        <Skeleton variant="text" className="mt-2" height={16} width={480} />
      </div>

      {/* The real form is a bare <form className="space-y-5 max-w-4xl">, not a panel. */}
      <div className="max-w-4xl space-y-5">
        <SkeletonForm fields={5} />
        <div className="space-y-2">
          <Skeleton variant="text" height={14} width="35%" />
          <SkeletonCodeEditor lines={12} />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" height={14} width="40%" />
          <SkeletonCodeEditor lines={10} />
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