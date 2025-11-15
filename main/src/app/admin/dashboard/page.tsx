'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
// Link not used on this page
import { AdminSidebar } from '@/components/AdminSidebar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Array<{
    id: string;
    user: string;
    problem: string;
    passed: boolean;
    timestamp: string;
  }>>([]);
  const hasLoadedActivitiesRef = useRef(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const fetchRecentSubmissions = useCallback(async () => {
    try {
      setActivitiesLoading(!hasLoadedActivitiesRef.current);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/activity/recent-submissions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const json: { submissions?: Array<{ id: string; created_at: string; user: string; problem: string; passed: boolean }> } = await res.json();
        setSubmissions((json.submissions || []).map((s) => ({
          id: s.id,
          user: s.user,
          problem: s.problem,
          passed: !!s.passed,
          timestamp: s.created_at
        })));
      }
    } catch (e) {
      console.error('Failed to fetch recent submissions', e);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentSubmissions();
  }, [fetchRecentSubmissions]);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Mouse-following glow */}
          <div 
            className="absolute w-96 h-96 bg-green-400/5 rounded-full blur-3xl transition-all duration-500 ease-out"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
            }}
          />
          
          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-20 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
          
          {/* Circuit Pattern with animations */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 left-20 w-32 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse"></div>
            <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-20 left-52 w-0.5 h-16 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-36 left-52 w-24 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-40 right-20 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-60 right-20 w-40 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>
        </div>

        {/* Top Navigation Bar */}
        <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
          <Logo size="md" className="cursor-pointer" />
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
              Admin: {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="flex">
          <AdminSidebar />

          {/* Main Content */}
          <main className="flex-1 p-8">
            <LoadingState 
              isLoading={!isLoaded}
              skeleton={
                <div className="mb-8 space-y-4">
                  <SkeletonText lines={2} width="60%" />
                  <SkeletonText lines={1} width="40%" />
                </div>
              }
            >
              <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Admin Dashboard
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Manage contests and problems for the competitive programming platform
                </p>
              </div>
            </LoadingState>

            {/* Recent Activity (last 24 hours submissions) */}
            <div className={`p-0 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s' }}>
              <h2 className="text-2xl font-bold text-white mb-6 relative">
                Recent Activity
                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-red-400 to-red-600 animate-pulse" />
              </h2>
              {activitiesLoading ? (
                <div className="space-y-3">
                  <SkeletonText lines={3} />
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-3">
                  {submissions.map((s, index) => (
                    <div 
                      key={s.id}
                      className="flex items-center gap-4 p-4 transition-colors duration-300 group"
                      style={{ transitionDelay: `${index * 0.05}s` }}
                    >
                      <div className={`w-3 h-3 rounded-full ${s.passed ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                      <div className="flex-1">
                        <p className="text-white font-medium group-hover:text-red-400 transition-colors duration-300">
                          {s.passed ? 'Solved' : 'Attempted'} {s.problem} by {s.user}
                        </p>
                        <p className="text-gray-400 text-sm">{formatTimeAgo(s.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No submissions in the last 24 hours.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      </AdminGuard>
    </AuthGuard>
  );
}
