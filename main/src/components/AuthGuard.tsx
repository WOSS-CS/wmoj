'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageLoading } from '@/components/LoadingStates';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowAuthenticated?: boolean;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/dashboard',
  allowAuthenticated = false
}: AuthGuardProps) {
  const { user, loading, userDashboardPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If auth is required and no user, redirect to login immediately
    if (requireAuth && !user) {
      router.replace('/auth/login');
      return;
    }

    // Defer redirect until we actually know the user's dashboard path.
    // This prevents prematurely sending an admin to /dashboard before their
    // role (and thus /admin/dashboard path) is resolved asynchronously.
    if (user && !userDashboardPath) {
      return; // Wait for role resolution
    }

    if (!allowAuthenticated && user && userDashboardPath) {
      const targetPath = userDashboardPath || redirectTo;
      if (targetPath !== window.location.pathname) {
        router.replace(targetPath);
      }
    }
  }, [user, loading, requireAuth, allowAuthenticated, redirectTo, userDashboardPath, router]);

  useEffect(() => {
    // Mouse listener removed
  }, []);

  // Show enhanced loading state
  if (loading) {
    return <PageLoading message="Loading..." />;
  }

  // Don't render children if auth requirements aren't met
  if (!loading && requireAuth && !user) {
    return null;
  }

  // If we're waiting on the dashboard path (role) still, show loading screen to avoid flash
  if (user && !userDashboardPath && !allowAuthenticated) {
    return <PageLoading message="Determining your access..." />;
  }

  if (!loading && !allowAuthenticated && user && userDashboardPath) {
    return null; // Redirect will happen via effect
  }

  return <>{children}</>;
}
