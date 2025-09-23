'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
  const { user, loading, userDashboardPath, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) {
      router.replace('/auth/login');
      return;
    }
    if (!allowAuthenticated && user) {
      const rolePath = userRole === 'admin' ? '/admin' : '/dashboard';
      const targetPath = userDashboardPath || rolePath || redirectTo;
      // Avoid redirect loops
      if (targetPath !== window.location.pathname) {
        router.replace(targetPath);
      }
    }
  }, [user, loading, requireAuth, allowAuthenticated, redirectTo, userDashboardPath, userRole, router]);

  // Show loading state
  if (loading || (user && userRole == null)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if auth requirements aren't met
  if (!loading && requireAuth && !user) {
    return null;
  }

  if (!loading && !allowAuthenticated && user) {
    return null;
  }

  return <>{children}</>;
}
