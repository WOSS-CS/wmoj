'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, CardLoading, SkeletonText, LeaderboardLoading } from '@/components/LoadingStates';
import { checkContestParticipation } from '@/utils/participationCheck';
import type { Contest } from '@/types/contest';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function ContestPage() {
  const params = useParams<{ id: string }>();
  const { user, session, signOut } = useAuth();
  const { timeRemaining, isActive } = useCountdown();
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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
        const resL = await fetch(`/api/contests/${params.id}/leaderboard`);
        const jsonL = await resL.json();
        if (resL.ok) setLeaderboard(jsonL.leaderboard || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contest');
      } finally {
        setLoading(false);
        setIsLoaded(true);
      }
    })();
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [params.id, accessChecked]);

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
      
      // Redirect to contests page
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
        const res = await fetch(`/api/contests/${params.id}/leaderboard`);
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
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
          <Logo size="md" className="cursor-pointer" />
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-colors duration-300">Dashboard</Link>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-colors duration-300">{user?.user_metadata?.username || user?.email}</span>
            <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300">Sign Out</button>
          </div>
        </nav>

        {/* Enhanced Main Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
          <LoadingState 
            isLoading={loading}
            skeleton={
              <div className="space-y-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
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
                <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </LoadingState>
          
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Enhanced Contest Header */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-4 relative">
                    {contest?.name}
                    <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                  </h1>
                  <div className="text-gray-300 mb-4 text-lg leading-relaxed max-w-2xl">{contest?.description}</div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Length: <span className="text-white font-semibold">{contest?.length} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Problems: <span className="text-white font-semibold">{problems.length}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 ml-6">
                  <button
                    onClick={handleLeaderboardToggle}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors duration-300 relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </button>
                  <button
                    onClick={handleLeaveContest}
                    disabled={leaving}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {leaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Leaving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Leave Contest
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </button>
                </div>
              </div>
              {/* Enhanced Countdown Timer */}
              {isActive && timeRemaining !== null && (
                <div className="bg-gradient-to-r from-green-400/10 to-emerald-400/10 border border-green-400/30 rounded-xl p-6 mb-8 backdrop-blur-sm hover:bg-gradient-to-r hover:from-green-400/15 hover:to-emerald-400/15 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="flex-1">
                      <div className="text-green-400 text-sm font-medium mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Contest Active
                      </div>
                      <div className="text-white text-2xl font-bold">
                        {Math.floor(timeRemaining / 3600) > 0 
                          ? `${Math.floor(timeRemaining / 3600)}:${Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                          : `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                        } remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 text-sm">Time Left</div>
                      <div className="w-16 h-16 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Dynamic Leaderboard */}
              {showLeaderboard && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8 hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Leaderboard
                    </h2>
                    {leaderboardLoading && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    )}
                  </div>
                  
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 animate-bounce">🏆</div>
                      <h3 className="text-xl font-semibold text-white mb-2">No Submissions Yet</h3>
                      <p className="text-gray-400">Be the first to solve a problem!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leaderboard.map((entry, index) => (
                        <div 
                          key={entry.user_id} 
                          className={`flex items-center justify-between bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors duration-300 ${
                            index === 0 ? 'border border-yellow-400/30 bg-gradient-to-r from-yellow-400/5 to-yellow-400/10' :
                            index === 1 ? 'border border-gray-400/30 bg-gradient-to-r from-gray-400/5 to-gray-400/10' :
                            index === 2 ? 'border border-orange-400/30 bg-gradient-to-r from-orange-400/5 to-orange-400/10' :
                            'border border-white/10'
                          }`}
                          style={{ transitionDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black animate-pulse' :
                              index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-black' :
                              index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                              'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                            }`}>
                              {index < 3 ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ) : (
                                entry.rank
                              )}
                            </div>
                            <div>
                              <div className="text-white font-semibold text-lg">{entry.username}</div>
                              <div className="text-gray-400 text-sm">{entry.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold text-xl">{entry.total_score} pts</div>
                            <div className="text-gray-400 text-sm flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {entry.solved_problems}/{entry.total_problems} solved
                            </div>
                            {entry.solved_problems > 0 && (
                              <div className="mt-2 w-32 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full transition-all duration-1000"
                                  style={{ width: `${(entry.solved_problems / entry.total_problems) * 100}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Enhanced Problems Section */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Contest Problems
                  <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">
                    {problems.length} problems
                  </span>
                </h2>
              </div>
              
              {problems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-bounce">📝</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Problems Yet</h3>
                  <p className="text-gray-400">Problems will appear here when they&apos;re added to the contest.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {problems.map((p, index) => (
                    <Link 
                      key={p.id} 
                      href={`/problems/${p.id}`} 
                      className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-green-400/50 transition-colors duration-300 group ${
                        hoveredProblem === p.id ? 'scale-105 shadow-lg shadow-green-400/20 border-green-400/50' : ''
                      }`}
                      onMouseEnter={() => setHoveredProblem(p.id)}
                      onMouseLeave={() => setHoveredProblem(null)}
                      style={{ transitionDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors duration-300">
                          {p.name}
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Contest Problem
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Click to solve</span>
                        <svg className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
