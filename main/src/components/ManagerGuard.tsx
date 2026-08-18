'use client';

import { useAuth } from '@/contexts/AuthContext';

import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

interface ManagerGuardProps {
  children: React.ReactNode;
}

/**
 * ManagerGuard renders its children once the auth context has initialized.
 *
 * Access control is enforced server-side in every manager page.tsx before the
 * client component is rendered, so this guard deliberately does NOT re-check
 * the user's role in the browser. Doing so caused a race condition where a
 * stale or not-yet-refreshed access token caused the browser-side role query
 * to return 'regular', incorrectly redirecting managers on page reload.
 *
 * This guard exists only to:
 *  1. Show a loading skeleton while auth context initializes (avoids flash).
 *  2. Return null if there is no authenticated user — the wrapping AuthGuard
 *     handles the redirect to /auth/login.
 */
export function ManagerGuard({ children }: ManagerGuardProps) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
        <Skeleton variant="text" width="30%" height={28} />
        <SkeletonTable rows={6} />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}