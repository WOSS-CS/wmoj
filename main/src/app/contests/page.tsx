'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import { Contest } from '@/types/contest';
import { useRouter } from 'next/navigation';

export default function ContestsPage() {
  const { user, signOut, session } = useAuth();
  const { startCountdown } = useCountdown();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedContestId, setJoinedContestId] = useState<string | null>(null);
  const [loadingParticipation, setLoadingParticipation] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredContest, setHoveredContest] = useState<string | null>(null);
  const [joiningContest, setJoiningContest] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/contests');
        const json = await res.json();
        if (res.ok) {
          setContests(json.contests || []);
        } else {
          setError(json.error || 'Failed to fetch contests');
        }
      } catch {
        setError('Failed to fetch contests');
      } finally {
        setLoading(false);
      }
    })();
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (session?.access_token && !loadingParticipation) {
      setLoadingParticipation(true);
      fetch('/api/contests/participation', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
        .then(res => res.json())
        .then(json => {
          if (json.contestId) {
            setJoinedContestId(json.contestId);
          }
        })
        .catch(e => console.error('Error checking participation:', e))
        .finally(() => setLoadingParticipation(false));
    }
  }, [session?.access_token, loadingParticipation]);

  const handleJoinContest = async (contestId: string, contestName: string, contestLength: number) => {
    if (joiningContest) return;
    setJoiningContest(contestId);
    try {
      const res = await fetch(`/api/contests/${contestId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: user?.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to join contest');
      setJoinedContestId(contestId);
      startCountdown(contestId, contestName, contestLength);
      router.push(`/contests/${contestId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to join contest');
    } finally {
      setJoiningContest(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
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
          <Link href="/" className="text-2xl font-bold text-white group cursor-pointer">
            <span className="text-green-400 transition-all duration-300 group-hover:scale-110 inline-block">W</span>
            <span className="text-white transition-all duration-300 group-hover:scale-110 inline-block" style={{ animationDelay: '0.1s' }}>MOJ</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all duration-300">
              Dashboard
            </Link>
            <span className="px-4 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 min-h-screen">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Contests</h2>
              <nav className="space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
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
                <Link href="/contests" className="flex items-center gap-3 px-4 py-3 text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Contests
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistics
                </div>
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
                  Available Contests
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Browse and join available contests
                </p>
              </div>
            </LoadingState>

            {/* Enhanced Loading State */}
            <LoadingState 
              isLoading={loading}
              skeleton={<CardLoading count={6} />}
            >
              <div className="flex justify-center items-center py-12">
                <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </LoadingState>

            {/* Enhanced Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Contests List */}
            {!loading && !error && (
              <div className="space-y-4">
                {contests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <h3 className="text-2xl font-semibold text-white mb-2">No Contests Available</h3>
                    <p className="text-gray-300">Please check back later.</p>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-300">
                        <div className="col-span-4">Contest</div>
                        <div className="col-span-2">Duration</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Participants</div>
                        <div className="col-span-2">Actions</div>
                      </div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="divide-y divide-white/10">
                      {contests.map((contest, index) => (
                        <div
                          key={contest.id}
                          className={`px-6 py-4 hover:bg-white/5 transition-all duration-300 ${
                            hoveredContest === contest.id ? 'bg-white/10' : ''
                          }`}
                          onMouseEnter={() => setHoveredContest(contest.id)}
                          onMouseLeave={() => setHoveredContest(null)}
                          style={{ transitionDelay: `${index * 0.05}s` }}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4">
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {contest.name}
                              </h3>
                              <p className="text-gray-400 text-sm line-clamp-2">
                                {contest.description || 'No description available'}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-white font-medium">
                                {contest.length} min
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">
                                Active
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400 text-sm">
                                {Math.floor(Math.random() * 50) + 10} participants
                              </span>
                            </div>
                            <div className="col-span-2">
                              {joinedContestId === contest.id ? (
                                <Link
                                  href={`/contests/${contest.id}`}
                                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handleJoinContest(contest.id, contest.name, contest.length)}
                                  disabled={joiningContest === contest.id || (joinedContestId && joinedContestId !== contest.id)}
                                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                  {joiningContest === contest.id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                      Joining...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                      Join
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}