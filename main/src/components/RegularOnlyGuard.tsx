"use client";

import { useAuth } from '@/contexts/AuthContext';

import { Skeleton, SkeletonTable } from '@/components/SkeletonLoader';

interface RegularOnlyGuardProps {
  children: React.ReactNode;
}

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