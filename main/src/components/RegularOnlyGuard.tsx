"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { PageLoading } from '@/components/LoadingStates';

interface RegularOnlyGuardProps {
  children: React.ReactNode;
}

export function RegularOnlyGuard({ children }: RegularOnlyGuardProps) {
  const { userRole, loading, user } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return; // AuthGuard should handle unauthenticated

    if (userRole === 'admin') {
      setRedirecting(true);
      // Send admins to admin dashboard
      if (window.location.pathname !== '/admin/dashboard') {
        router.replace('/admin/dashboard');
      }
    }
  }, [userRole, loading, user, router]);

  // Loading / transition states
  if (loading || (user && !userRole) || redirecting) {
    return <PageLoading message="Preparing your workspace..." />;
  }

  // If admin (redirecting already triggered), don't render user content
  if (userRole === 'admin') return null;

  return <>{children}</>;
}
