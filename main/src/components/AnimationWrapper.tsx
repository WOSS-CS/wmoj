'use client';

import { ReactNode } from 'react';

/* ==========================================================================
   AnimationWrapper — Simplified
   
   Kept for backward compatibility with landing page components that import it.
   Non-landing pages should NOT use animation wrappers; content renders instantly.
   ========================================================================== */

interface AnimationWrapperProps {
  children: ReactNode;
  animation?: string;
  delay?: number;
  duration?: number;
  trigger?: boolean;
  className?: string;
}

export function AnimationWrapper({
  children,
  className = ''
}: AnimationWrapperProps) {
  return <div className={className}>{children}</div>;
}

interface StaggeredAnimationProps {
  children: ReactNode[];
  animation?: string;
  staggerDelay?: number;
  className?: string;
}

export function StaggeredAnimation({
  children,
  className = ''
}: StaggeredAnimationProps) {
  return <div className={className}>{children}</div>;
}

interface HoverAnimationProps {
  children: ReactNode;
  effect?: string;
  className?: string;
}

export function HoverAnimation({
  children,
  className = ''
}: HoverAnimationProps) {
  return <div className={className}>{children}</div>;
}

/* --- LoadingSpinner — The one universally useful animation --- */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = ''
}: LoadingSpinnerProps) {
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-[3px]',
  };

  return (
    <div
      className={`${sizes[size]} border-border border-t-brand-primary rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/* Removed: PulseEffect, ShimmerEffect — unnecessary wrappers */
