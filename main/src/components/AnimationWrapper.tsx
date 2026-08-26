'use client';

/* ==========================================================================
   LoadingSpinner — the only animation primitive this app actually uses.

   This file used to also export AnimationWrapper, StaggeredAnimation and
   HoverAnimation: three pass-through <div>s kept "for backward compatibility
   with landing page components". Those landing components are gone and no JSX
   ever rendered the wrappers, so they went with them. Nineteen files import
   LoadingSpinner from here; the module name stays for their sake.
   ========================================================================== */

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
