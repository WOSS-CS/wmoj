'use client';

import { ReactNode } from 'react';

/* ==========================================================================
   Skeleton Loader — Clean, token-aware shimmer skeletons
   ========================================================================== */

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  children,
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const variantClass: Record<string, string> = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div
      className={`bg-surface-2 loading-shimmer ${variantClass[variant] || 'rounded-md'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* --- Composite Skeletons --- */

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  return (
    <div className={`glass-panel p-6 space-y-3 ${className}`}>
      <Skeleton variant="text" width="50%" height={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '40%' : '100%'} height={14} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`glass-panel overflow-hidden ${className}`}>
      <div className="px-6 py-3 border-b border-border flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="20%" height={14} />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-3 flex gap-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton key={colIdx} variant="text" width={colIdx === 0 ? '30%' : '20%'} height={14} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
}

export function SkeletonList({ items = 5, className = '' }: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton variant="rounded" width={36} height={36} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  columns?: number;
  className?: string;
}

export function SkeletonGrid({ items = 6, columns = 3, className = '' }: SkeletonGridProps) {
  const colClass: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
  return (
    <div className={`grid ${colClass[columns] || 'grid-cols-3'} gap-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export function SkeletonForm({ fields = 4, className = '' }: SkeletonFormProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton variant="text" width="20%" height={14} />
          <Skeleton variant="rounded" width="100%" height={40} />
        </div>
      ))}
      <Skeleton variant="rounded" width={120} height={40} />
    </div>
  );
}

interface SkeletonProfileProps {
  className?: string;
  showStats?: boolean;
  showBio?: boolean;
}

export function SkeletonProfile({ className = '', showStats = true, showBio = true }: SkeletonProfileProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" width={64} height={64} />
        <div className="space-y-2">
          <Skeleton variant="text" width={160} height={20} />
          <Skeleton variant="text" width={200} height={14} />
        </div>
      </div>
      {showBio && (
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="70%" height={14} />
        </div>
      )}
      {showStats && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton variant="text" width="100%" height={22} />
              <Skeleton variant="text" width="60%" height={12} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SkeletonLeaderboardProps {
  items?: number;
  className?: string;
}

export function SkeletonLeaderboard({ items = 10, className = '' }: SkeletonLeaderboardProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 glass-panel">
          <Skeleton variant="text" width={24} height={18} />
          <Skeleton variant="rounded" width={32} height={32} />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="50%" height={16} />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
          <Skeleton variant="text" width={60} height={16} />
        </div>
      ))}
    </div>
  );
}

interface SkeletonCodeEditorProps {
  className?: string;
  lines?: number;
}

export function SkeletonCodeEditor({ className = '', lines = 10 }: SkeletonCodeEditorProps) {
  return (
    <div className={`bg-surface-1 border border-border rounded-lg p-4 space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton variant="text" width={20} height={14} className="opacity-50" />
          <Skeleton variant="text" width={`${i % 3 === 0 ? 75 : i % 3 === 1 ? 55 : 35}%`} height={14} />
        </div>
      ))}
    </div>
  );
}
