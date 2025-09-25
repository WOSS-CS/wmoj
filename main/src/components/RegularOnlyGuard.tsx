"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center relative overflow-hidden">
        <div className="text-center animate-fade-in-up">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
          </div>
          <p className="text-gray-300 text-sm">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  // If admin (redirecting already triggered), don't render user content
  if (userRole === 'admin') return null;

  return <>{children}</>;
}
