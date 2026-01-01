'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonGrid, SkeletonForm, SkeletonProfile, SkeletonLeaderboard, SkeletonCodeEditor } from './SkeletonLoader';
import { LoadingSpinner } from './AnimationWrapper';

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
            <LoadingSpinner size="lg" color="green" />
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface PageLoadingProps {
  className?: string;
  message?: string;
}

export function PageLoading({
  className = '',
  message = 'Loading...'
}: PageLoadingProps) {
  return (
    <div className={`fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center ${className}`}>
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-secondary/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Animation */}
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-2 border-brand-primary/20 rounded-full animate-ping-slow" />
          <div className="absolute inset-2 border-2 border-brand-primary/40 rounded-full animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white font-heading">W</span>
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-white font-heading tracking-wide animate-pulse">
            {message}
          </h2>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CardLoadingProps {
  className?: string;
  count?: number;
}

export function CardLoading({
  className = '',
  count = 3
}: CardLoadingProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

interface TableLoadingProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function TableLoading({
  className = '',
  rows = 5,
  columns = 4
}: TableLoadingProps) {
  return (
    <SkeletonTable
      className={className}
      rows={rows}
      columns={columns}
    />
  );
}

interface ListLoadingProps {
  className?: string;
  items?: number;
}

export function ListLoading({
  className = '',
  items = 5
}: ListLoadingProps) {
  return (
    <SkeletonList
      className={className}
      items={items}
    />
  );
}

interface GridLoadingProps {
  className?: string;
  items?: number;
  columns?: number;
}

export function GridLoading({
  className = '',
  items = 6,
  columns = 3
}: GridLoadingProps) {
  return (
    <SkeletonGrid
      className={className}
      items={items}
      columns={columns}
    />
  );
}

interface FormLoadingProps {
  className?: string;
  fields?: number;
}

export function FormLoading({
  className = '',
  fields = 4
}: FormLoadingProps) {
  return (
    <SkeletonForm
      className={className}
      fields={fields}
    />
  );
}

interface ProfileLoadingProps {
  className?: string;
  showStats?: boolean;
  showBio?: boolean;
}

export function ProfileLoading({
  className = '',
  showStats = true,
  showBio = true
}: ProfileLoadingProps) {
  return (
    <SkeletonProfile
      className={className}
      showStats={showStats}
      showBio={showBio}
    />
  );
}

interface LeaderboardLoadingProps {
  className?: string;
  items?: number;
}

export function LeaderboardLoading({
  className = '',
  items = 10
}: LeaderboardLoadingProps) {
  return (
    <SkeletonLeaderboard
      className={className}
      items={items}
    />
  );
}

interface CodeEditorLoadingProps {
  className?: string;
  lines?: number;
}

export function CodeEditorLoading({
  className = '',
  lines = 10
}: CodeEditorLoadingProps) {
  return (
    <SkeletonCodeEditor
      className={className}
      lines={lines}
    />
  );
}

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
      className={`relative overflow-hidden transition-all duration-300 ${isLoading ? 'cursor-not-allowed opacity-75' : ''
        } ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" color="green" />
            <span className="text-sm">{loadingText}</span>
          </div>
        </div>
      )}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    </button>
  );
}

interface InlineLoadingProps {
  children: ReactNode;
  isLoading: boolean;
  loadingText?: string;
  className?: string;
}

export function InlineLoading({
  children,
  isLoading,
  loadingText = 'Loading...',
  className = ''
}: InlineLoadingProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <LoadingSpinner size="sm" color="green" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
}

interface OverlayLoadingProps {
  children: ReactNode;
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function OverlayLoading({
  children,
  isLoading,
  message = 'Loading...',
  className = ''
}: OverlayLoadingProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="md" color="green" />
              <span className="text-gray-700 dark:text-gray-300">{message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProgressLoadingProps {
  progress: number;
  message?: string;
  className?: string;
}

export function ProgressLoading({
  progress,
  message = 'Loading...',
  className = ''
}: ProgressLoadingProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  width?: string;
}

export function SkeletonText({
  lines = 3,
  className = '',
  width = '100%'
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '60%' : width}
          height={16}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({
  size = 'md',
  className = ''
}: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  return (
    <Skeleton
      variant="circular"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}

interface SkeletonButtonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonButton({
  width = '120px',
  height = '40px',
  className = ''
}: SkeletonButtonProps) {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={height}
      className={className}
    />
  );
}
