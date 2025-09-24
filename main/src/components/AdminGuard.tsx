'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || loading) return;
      
      try {
        const res = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
        });
        
        if (res.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        router.replace('/dashboard');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, loading, router]);

  // Show loading state while checking admin status
  if (loading || checkingAdmin || isAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center relative overflow-hidden">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-red-400/30 border-t-red-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-red-400/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-2 w-16 h-16 border-2 border-red-400/20 border-b-red-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '2s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium animate-pulse">Checking Admin Access...</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          <div className="w-48 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  // If not admin, don't render children (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
