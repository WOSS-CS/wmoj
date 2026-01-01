'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import dynamic from 'next/dynamic';
import { LoadingState, CardLoading, SkeletonText, LeaderboardLoading } from '@/components/LoadingStates';
import { checkContestParticipation } from '@/utils/participationCheck';
import type { Contest } from '@/types/contest';
import { useRouter } from 'next/navigation';

const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

export default function ContestPage() {
  const params = useParams<{ id: string }>();
  const { user, session, signOut } = useAuth();
  const { timeRemaining, isActive, stopCountdown } = useCountdown();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<{ id: string; name: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{
    user_id: string;
    username: string;
    email: string;
    total_score: number;
    solved_problems: number;
    total_problems: number;
    rank: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredProblem, setHoveredProblem] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Check access permission
  useEffect(() => {
    (async () => {
      if (!user || !params.id) return;

      try {
        const hasAccess = await checkContestParticipation(user.id, params.id);
        if (!hasAccess) {
          router.push('/contests');
          return;
        }
        setAccessChecked(true);
      } catch (error) {
        console.error('Error checking contest access:', error);
        router.push('/contests');
      }
    })();
  }, [user, params.id, router]);

  useEffect(() => {
    if (!accessChecked) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/contests/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load contest');
        setContest(json.contest);
        const resP = await fetch(`/api/contests/${params.id}/problems`);
        const jsonP = await resP.json();
        if (resP.ok) setProblems(jsonP.problems || []);

        // Fetch leaderboard
        const resL = await fetch(`/api/contests/${params.id}/leaderboard`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const jsonL = await resL.json();
        if (resL.ok) setLeaderboard(jsonL.leaderboard || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contest');
      } finally {
        setLoading(false);
        setIsLoaded(true);
      }
    })();
  }, [params.id, accessChecked, session?.access_token]);

  const handleSignOut = async () => { await signOut(); };

  const handleLeaveContest = async () => {
    if (!user || !params.id) return;

    try {
      setLeaving(true);
      const token = session?.access_token;

      const res = await fetch(`/api/contests/${params.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed to leave contest');
      }

      // Immediately clear countdown context to prevent redirect loops,
      // then redirect to contests page.
      stopCountdown();
      router.push('/contests');
    } catch (error) {
      console.error('Error leaving contest:', error);
      alert(error instanceof Error ? error.message : 'Failed to leave contest');
    } finally {
      setLeaving(false);
    }
  };

  const handleLeaderboardToggle = async () => {
    if (!showLeaderboard) {
      setLeaderboardLoading(true);
      try {
        const res = await fetch(`/api/contests/${params.id}/leaderboard`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const json = await res.json();
        if (res.ok) setLeaderboard(json.leaderboard || []);
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      } finally {
        setLeaderboardLoading(false);
      }
    }
    setShowLeaderboard(!showLeaderboard);
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="relative overflow-hidden w-full h-full">
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">

            {/* Header / Config Area */}
            <div className="flex justify-between items-center mb-6">
              <Link href="/contests" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 hover:translate-x-[-2px] transition-transform">
                ← Back to Contests
              </Link>
              {leaving && <span className="text-xs text-red-400 animate-pulse">Leaving contest...</span>}
            </div>

            <LoadingState
              isLoading={loading}
              skeleton={
                <div className="space-y-8">
                  <div className="bg-surface-1 rounded-2xl p-8 border border-white/5">
                    <SkeletonText lines={2} width="60%" />
                    <div className="mt-4 space-y-2">
                      <SkeletonText lines={1} width="40%" />
                      <SkeletonText lines={1} width="30%" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <SkeletonText lines={1} width="40%" />
                      <CardLoading count={3} />
                    </div>
                    <div className="space-y-4">
                      <SkeletonText lines={1} width="40%" />
                      <LeaderboardLoading items={5} />
                    </div>
                  </div>
                </div>
              }
            >
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </LoadingState>

            {error ? (
              <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
                <p className="text-red-400">{error}</p>
              </div>
            ) : (
              <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* Enhanced Contest Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-4xl font-bold text-white font-heading relative inline-block">
                        {contest?.name}
                      </h1>
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-mono uppercase tracking-wider animate-pulse">
                        Active
                      </span>
                    </div>

                    <div className="mb-6 max-w-3xl">
                      <div className="glass-panel p-6">
                        <MarkdownRenderer content={contest?.description || '*No description provided*'} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm font-mono">
                      <div className="flex items-center gap-2 text-gray-400 bg-surface-2 px-3 py-1.5 rounded-lg border border-white/5">
                        <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Length: <span className="text-white">{contest?.length} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 bg-surface-2 px-3 py-1.5 rounded-lg border border-white/5">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Problems: <span className="text-white">{problems.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full lg:w-auto">
                    <button
                      onClick={handleLeaderboardToggle}
                      className="flex-1 lg:flex-none px-6 py-3 bg-surface-2 text-white border border-white/10 rounded-lg hover:bg-surface-3 transition-colors flex items-center justify-center gap-2 group"
                    >
                      <svg className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                    </button>
                    <button
                      onClick={handleLeaveContest}
                      disabled={leaving}
                      className="flex-1 lg:flex-none px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      {leaving ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">Leave</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Dynamic Leaderboard */}
                {showLeaderboard && (
                  <div className="glass-panel p-8 mb-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-heading text-white flex items-center gap-3">
                        Live Leaderboard
                      </h2>
                      {leaderboardLoading && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs uppercase tracking-wider">Refreshing...</span>
                        </div>
                      )}
                    </div>

                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12 bg-black/20 rounded-xl">
                        <h3 className="text-lg font-medium text-white mb-2">No Submissions Yet</h3>
                        <p className="text-gray-500 text-sm">Be the first to solve a problem!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                          <div
                            key={entry.user_id}
                            className="flex items-center justify-between p-4 rounded-lg bg-surface-2 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg font-mono ${index === 0 ? 'bg-yellow-400 text-black' :
                                index === 1 ? 'bg-gray-300 text-black' :
                                  index === 2 ? 'bg-orange-400 text-white' :
                                    'bg-surface-3 text-gray-400'
                                }`}>
                                {index < 3 ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ) : (
                                  `#${entry.rank}`
                                )}
                              </div>
                              <div>
                                <div className="text-white font-medium">{entry.username}</div>
                                <div className="text-gray-500 text-xs">{entry.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-brand-primary font-bold font-mono">{entry.total_score} pts</div>
                              <div className="text-gray-500 text-xs font-mono">
                                {entry.solved_problems}/{entry.total_problems} solved
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced Problems Section */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 font-heading">
                    Contest Problems
                  </h2>
                </div>

                {problems.length === 0 ? (
                  <div className="text-center py-12 glass-panel">
                    <h3 className="text-xl font-semibold text-white mb-2">No Problems Yet</h3>
                    <p className="text-gray-400">Problems will appear here when they&apos;re added to the contest.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {problems.map((p, index) => (
                      <Link
                        key={p.id}
                        href={`/problems/${p.id}`}
                        className={`glass-panel p-6 hover:border-brand-primary/50 transition-all duration-300 group hover:-translate-y-1 ${hoveredProblem === p.id ? 'shadow-lg shadow-brand-primary/10' : ''
                          }`}
                        onMouseEnter={() => setHoveredProblem(p.id)}
                        onMouseLeave={() => setHoveredProblem(null)}
                        style={{ transitionDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors duration-300 font-heading">
                            {p.name}
                          </div>
                          <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-4">
                          <span>Contest Problem</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                          <span className="text-gray-500 text-sm group-hover:text-white transition-colors">Solve Now</span>
                          <svg className="w-5 h-5 text-brand-primary transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
