"use client";

import { useAuth } from '@/contexts/AuthContext';

import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

interface RegularOnlyGuardProps {
  children: React.ReactNode;
}

/**
 * ⚠️ The name is a misnomer and the behaviour below is the contract.
 *
 * This does NOT restrict anything to "regular" users — it renders `children`
 * for admins, managers, regular users and signed-out visitors alike. All it
 * does is hold a skeleton while `AuthContext` is still resolving the role, so
 * the wrapped tree does not flash a signed-out state first.
 *
 * Its one caller (`app/contests/[id]/ContestDetailClient.tsx`) reads as though
 * the restriction were real. Renaming it is a one-line change *there*, not
 * here; do not "fix" this by adding a role check without deciding what should
 * happen to staff on a contest page.
 */

export function RegularOnlyGuard({ children }: RegularOnlyGuardProps) {
  const { userRole, loading, user } = useAuth();

  // Loading / transition states
  if (loading || (user && !userRole)) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className="w-full space-y-6">
        <Skeleton variant="text" width="30%" height={28} />
        <SkeletonTable rows={6} />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  // All authenticated users (regular, admin, manager) can access user-side routes
  return <>{children}</>;
}