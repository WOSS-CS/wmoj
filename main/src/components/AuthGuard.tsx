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
  const { user, loading, userDashboardPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) {
      router.replace('/auth/login');
      return;
    }
    if (!allowAuthenticated && user) {
      const targetPath = userDashboardPath || redirectTo;
      // Avoid redirect loops
      if (targetPath !== window.location.pathname) {
        router.replace(targetPath);
      }
    }
  }, [user, loading, requireAuth, allowAuthenticated, redirectTo, userDashboardPath, router]);

  // Show enhanced loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
        </div>
        
        <div className="text-center animate-fade-in-up">
          {/* Enhanced Loading Spinner */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-green-400/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-2 w-16 h-16 border-2 border-green-400/20 border-b-green-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '2s' }}></div>
          </div>
          
          {/* Loading Text with Animation */}
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium animate-pulse">Loading</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-6 w-48 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-shimmer"></div>
          </div>
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
