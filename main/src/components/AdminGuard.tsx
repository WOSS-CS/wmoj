'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './AnimationWrapper';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, session, loading, userRole } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !session || loading) return;

      if (userRole === 'admin') {
        setIsAdmin(true);
        setCheckingAdmin(false);
        return;
      } else if (userRole === 'regular') {
        setIsAdmin(false);
        setCheckingAdmin(false);
        router.replace('/dashboard');
        return;
      }

      // Fallback: role not yet known; perform API check
      try {
        const res = await fetch('/api/admin/check', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
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
  }, [user, session, loading, router, userRole]);

  if (loading || checkingAdmin || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
