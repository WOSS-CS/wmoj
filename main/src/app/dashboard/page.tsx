'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { Activity } from '@/types/activity';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const hasLoadedActivitiesRef = useRef(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      // Only show skeleton on first load to avoid flicker on token refreshes
      setActivitiesLoading(!hasLoadedActivitiesRef.current);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/user/activity', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(data.activities);
          return;
        }
      }

      // Fallback: query Supabase directly if API returns nothing
      if (!user?.id) return;
      const userId = user.id;

      // Pull recent submissions without joins
      const { data: subs, error: subsErr } = await supabase
        .from('submissions')
        .select('id, problem_id, created_at, summary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (subsErr) {
        console.warn('[dashboard] fallback submissions error:', subsErr);
      }

      // Lookup problem names/contest ids
      const problemIds = Array.from(new Set((subs || []).map(s => s.problem_id).filter(Boolean)));
      let problemInfo: Record<string, { name: string; contest: string | null }> = {};
      if (problemIds.length > 0) {
        const { data: probs } = await supabase
          .from('problems')
          .select('id, name, contest')
          .in('id', problemIds);
        type Prob = { id: string; name: string; contest: string | null };
        problemInfo = (probs || []).reduce((acc: Record<string, { name: string; contest: string | null }>, p: Prob) => {
          acc[p.id] = { name: p.name, contest: p.contest };
          return acc;
        }, {});
      }

      // Build submission activities
      const subActivities = (subs || []).map((s) => {
        const summary = (s.summary || {}) as { passed?: number; failed?: number; total?: number };
        const total = Number(summary.total ?? 0);
        const passed = Number(summary.passed ?? 0);
        const failed = Number(summary.failed ?? 0);
        const solved = total > 0 && failed === 0 && passed === total;
        const pinfo = problemInfo[s.problem_id] || { name: 'Unknown Problem', contest: null };
        return {
          id: `sub-${s.id}`,
          type: 'submission' as const,
          action: solved ? 'Solved' : 'Attempted',
          item: pinfo.name,
          itemId: s.problem_id as string,
          timestamp: s.created_at as string,
          status: solved ? 'success' as const : 'warning' as const,
          passed,
          total,
          contestId: pinfo.contest,
          contestName: undefined as string | undefined,
        };
      });

      // Fetch contest joins and contest names
      const { data: joins } = await supabase
        .from('join_history')
        .select('id, contest_id, joined_at')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(100);
      const joinContestIds = Array.from(new Set((joins || []).map(j => j.contest_id).filter(Boolean)));
      let contestNames: Record<string, string> = {};
      if (joinContestIds.length > 0) {
        const { data: contests } = await supabase
          .from('contests')
          .select('id, name')
          .in('id', joinContestIds);
        type ContestRow = { id: string; name: string };
        contestNames = (contests || []).reduce((acc: Record<string, string>, c: ContestRow) => {
          acc[c.id] = c.name;
          return acc;
        }, {});
      }
      const joinActivities = (joins || []).map(j => ({
        id: `join-${j.id}`,
        type: 'contest_join' as const,
        action: 'Joined',
        item: contestNames[j.contest_id as string] || 'Unknown Contest',
        itemId: j.contest_id as string,
        timestamp: j.joined_at as string,
        status: 'info' as const,
      }));

      // Merge and sort
      const merged = [...subActivities, ...joinActivities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setActivities(merged);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchActivities();
    }
  }, [user?.id, fetchActivities]);

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
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
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
            <span className="px-4 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-colors duration-300">
              {user?.user_metadata?.username || user?.email}
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
          {/* Sidebar */}
          <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 min-h-screen">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
              <nav className="space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Overview
                </Link>
                <Link href="/problems" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Problems
                </Link>
                <Link href="/contests" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Contests
                </Link>
                
              </nav>
            </div>
          </aside>

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
                  Welcome to your Dashboard
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Ready to tackle some competitive programming challenges?
                </p>
              </div>
            </LoadingState>

            {/* Recent Activity */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.3s' }}>
              <h2 className="text-2xl font-bold text-white mb-6 relative">
                Recent Activity
                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
              </h2>
              {activitiesLoading ? (
                <div className="space-y-4">
                  <SkeletonText lines={3} />
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((a, index) => {
                    const color =
                      a.status === 'success' ? 'green' :
                      a.status === 'warning' ? 'yellow' : 'blue';
                    const timeAgo = formatTimeAgo(a.timestamp);
                    const exact = new Date(a.timestamp).toLocaleString();
                    const score = a.passed != null && a.total != null ? `${a.passed}/${a.total}` : null;
                    return (
                      <div
                        key={a.id}
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-300 group"
                        style={{ transitionDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-3 h-3 rounded-full bg-${color}-400 animate-pulse`} />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-white font-medium group-hover:text-green-400 transition-colors duration-300">
                                {a.action} {a.item}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-400/20 text-${color}-400 border border-${color}-400/20`}>
                                {a.type === 'submission' ? (a.status === 'success' ? 'Solved' : 'Attempted') : 'Joined'}
                              </span>
                              {a.type === 'submission' && score && (
                                <span className="text-xs text-gray-300">Score: <span className="text-white font-semibold">{score}</span></span>
                              )}
                              {a.type === 'submission' && a.contestName && (
                                <span className="text-xs text-gray-300">Contest: <span className="text-white">{a.contestName}</span></span>
                              )}
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                              <span>{timeAgo}</span>
                              <span className="mx-2">•</span>
                              <span>{exact}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {a.type === 'submission' ? (
                              <Link href={`/problems/${a.itemId}`} className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">View Problem</Link>
                            ) : (
                              <Link href={`/contests`} className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">View Contest</Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No recent activity yet. Start solving problems or join a contest!</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
