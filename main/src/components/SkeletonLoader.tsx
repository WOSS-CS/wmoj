'use client';

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  animate?: boolean;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className = '', 
  children, 
  animate = true, 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'rectangular':
        return 'rounded-lg';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-xl';
      default:
        return 'rounded-lg';
    }
  };

  const baseClasses = `bg-gray-300 dark:bg-gray-700 ${getVariantClass()} ${
    animate ? 'animate-shimmer' : ''
  }`;

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div 
      className={`${baseClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showButton?: boolean;
  lines?: number;
}

export function SkeletonCard({ 
  className = '',
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  showButton = true,
  lines = 3
}: SkeletonCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <Skeleton variant="circular" width={48} height={48} />
        )}
        <div className="flex-1 space-y-3">
          {showTitle && (
            <Skeleton variant="text" width="60%" height={20} />
          )}
          {showDescription && (
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, index) => (
                <Skeleton 
                  key={index} 
                  variant="text" 
                  width={index === lines - 1 ? '40%' : '100%'} 
                  height={16} 
                />
              ))}
            </div>
          )}
          {showButton && (
            <div className="pt-2">
              <Skeleton variant="rounded" width={100} height={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className = '',
  showHeader = true 
}: SkeletonTableProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} variant="text" width="20%" height={16} />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  variant="text" 
                  width={colIndex === 0 ? '30%' : '20%'} 
                  height={16} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  showSubtitle?: boolean;
}

export function SkeletonList({ 
  items = 5, 
  className = '',
  showAvatar = true,
  showSubtitle = true 
}: SkeletonListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          {showAvatar && (
            <Skeleton variant="circular" width={40} height={40} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" height={18} />
            {showSubtitle && (
              <Skeleton variant="text" width="50%" height={14} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  className?: string;
  columns?: number;
}

export function SkeletonGrid({ 
  items = 6, 
  className = '',
  columns = 3 
}: SkeletonGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || 'grid-cols-3'} gap-6 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
  showSubmit?: boolean;
}

export function SkeletonForm({ 
  fields = 4, 
  className = '',
  showSubmit = true 
}: SkeletonFormProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton variant="text" width="25%" height={16} />
          <Skeleton variant="rounded" width="100%" height={40} />
        </div>
      ))}
      {showSubmit && (
        <div className="pt-4">
          <Skeleton variant="rounded" width={120} height={40} />
        </div>
      )}
    </div>
  );
}

interface SkeletonProfileProps {
  className?: string;
  showStats?: boolean;
  showBio?: boolean;
}

export function SkeletonProfile({ 
  className = '',
  showStats = true,
  showBio = true 
}: SkeletonProfileProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="space-y-2">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="60%" height={16} />
        </div>
      </div>
      
      {showBio && (
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="80%" height={16} />
          <Skeleton variant="text" width="60%" height={16} />
        </div>
      )}
      
      {showStats && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="text-center space-y-2">
              <Skeleton variant="text" width="100%" height={24} />
              <Skeleton variant="text" width="60%" height={14} />
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
  showRank?: boolean;
  showScore?: boolean;
}

export function SkeletonLeaderboard({ 
  items = 10, 
  className = '',
  showRank = true,
  showScore = true 
}: SkeletonLeaderboardProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
          {showRank && (
            <Skeleton variant="circular" width={32} height={32} />
          )}
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={18} />
            <Skeleton variant="text" width="40%" height={14} />
          </div>
          {showScore && (
            <Skeleton variant="text" width="20%" height={18} />
          )}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCodeEditorProps {
  className?: string;
  lines?: number;
}

export function SkeletonCodeEditor({ 
  className = '',
  lines = 10 
}: SkeletonCodeEditorProps) {
  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Skeleton variant="text" width={24} height={16} className="bg-gray-700" />
            <Skeleton 
              variant="text" 
              width={index % 3 === 0 ? '80%' : index % 3 === 1 ? '60%' : '40%'} 
              height={16} 
              className="bg-gray-700" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
