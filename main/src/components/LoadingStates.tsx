'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonGrid, SkeletonForm, SkeletonProfile, SkeletonLeaderboard, SkeletonCodeEditor } from './SkeletonLoader';
import { LoadingSpinner } from './AnimationWrapper';

/* ==========================================================================
   Loading States — Clean, minimal, functional
   ========================================================================== */

interface LoadingStateProps {
  children: ReactNode;
  isLoading: boolean;
  skeleton?: ReactNode;
  fallback?: ReactNode;
  delay?: number;
  className?: string;
}

export function LoadingState({
  children,
  isLoading,
  skeleton,
  fallback,
  delay = 0,
  className = ''
}: LoadingStateProps) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);

  if (isLoading && showLoading) {
    return (
      <div className={className}>
        {skeleton || fallback || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

/* --- PageLoading: Clean centered spinner --- */

interface PageLoadingProps {
  className?: string;
  message?: string;
}

export function PageLoading({ className = '', message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 pointer-events-none ${className}`}>
      <LoadingSpinner size="xl" />
      <p className="text-sm text-text-muted font-medium">{message}</p>
    </div>
  );
}

/* --- Convenience Wrappers --- */

export function CardLoading({ className = '', count = 3 }: { className?: string; count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function TableLoading({ className = '', rows = 5, columns = 4 }: { className?: string; rows?: number; columns?: number }) {
  return <SkeletonTable className={className} rows={rows} columns={columns} />;
}

export function ListLoading({ className = '', items = 5 }: { className?: string; items?: number }) {
  return <SkeletonList className={className} items={items} />;
}

export function GridLoading({ className = '', items = 6, columns = 3 }: { className?: string; items?: number; columns?: number }) {
  return <SkeletonGrid className={className} items={items} columns={columns} />;
}

export function FormLoading({ className = '', fields = 4 }: { className?: string; fields?: number }) {
  return <SkeletonForm className={className} fields={fields} />;
}

export function ProfileLoading({ className = '', showStats = true, showBio = true }: { className?: string; showStats?: boolean; showBio?: boolean }) {
  return <SkeletonProfile className={className} showStats={showStats} showBio={showBio} />;
}

export function LeaderboardLoading({ className = '', items = 10 }: { className?: string; items?: number }) {
  return <SkeletonLeaderboard className={className} items={items} />;
}

export function CodeEditorLoading({ className = '', lines = 10 }: { className?: string; lines?: number }) {
  return <SkeletonCodeEditor className={className} lines={lines} />;
}

/* --- ButtonLoading --- */

interface ButtonLoadingProps {
  children: ReactNode;
  isLoading: boolean;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ButtonLoading({
  children,
  isLoading,
  loadingText = 'Loading...',
  className = '',
  disabled = false,
  onClick
}: ButtonLoadingProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center gap-2 ${isLoading ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
}

/* --- InlineLoading --- */

export function InlineLoading({
  children,
  isLoading,
  loadingText = 'Loading...',
  className = ''
}: { children: ReactNode; isLoading: boolean; loadingText?: string; className?: string }) {
  if (isLoading) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-text-muted">{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

/* --- OverlayLoading --- */

export function OverlayLoading({
  children,
  isLoading,
  message = 'Loading...',
  className = ''
}: { children: ReactNode; isLoading: boolean; message?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-lg">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="md" />
            <span className="text-sm text-text-muted">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- ProgressLoading --- */

export function ProgressLoading({
  progress,
  message = 'Loading...',
  className = ''
}: { progress: number; message?: string; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-muted">{message}</span>
        <span className="text-sm font-mono text-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-surface-2 rounded h-1.5 overflow-hidden">
        <div
          className="h-full bg-brand-primary rounded transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

/* --- Skeleton Text & Avatar Primitives --- */

export function SkeletonText({ lines = 3, className = '', width = '100%' }: { lines?: number; className?: string; width?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : width} height={14} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes: Record<string, string> = { sm: '32', md: '48', lg: '64', xl: '80' };
  const s = parseInt(sizes[size] || '48');
  return <Skeleton variant="circular" width={s} height={s} className={className} />;
}

export function SkeletonButton({ width = '120px', height = '40px', className = '' }: { width?: string; height?: string; className?: string }) {
  return <Skeleton variant="rounded" width={width} height={height} className={className} />;
}
