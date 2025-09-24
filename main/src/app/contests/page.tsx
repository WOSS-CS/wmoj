'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
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
        if (!res.ok) throw new Error(json?.error || 'Failed to load contests');
        setContests(json.contests || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contests');
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
    (async () => {
      if (!session?.access_token || loadingParticipation) return;
      setLoadingParticipation(true);
      try {
        const token = session.access_token;
        const res = await fetch('/api/contests/participation', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setJoinedContestId(json.contest_id);
        }
      } finally {
        setLoadingParticipation(false);
      }
    })();
  }, [session?.access_token, loadingParticipation]);

  const handleSignOut = async () => { await signOut(); };

  const handleJoinContest = async (contestId: string, contestName: string, contestLength: number) => {
    if (joiningContest) return;
    setJoiningContest(contestId);
    try {
      const token = session?.access_token;
      const res = await fetch(`/api/contests/${contestId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
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
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
          <Link href="/" className="text-3xl font-bold text-white group cursor-pointer">
            <span className="text-green-400 transition-all duration-300 group-hover:scale-110 inline-block">W</span>
            <span className="text-white transition-all duration-300 group-hover:scale-110 inline-block" style={{ animationDelay: '0.1s' }}>MOJ</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25">Dashboard</Link>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-all duration-300 transform hover:scale-105">{user?.user_metadata?.username || user?.email}</span>
            <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25">Sign Out</button>
          </div>
        </nav>

        {/* Enhanced Main Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
          <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl font-bold text-white mb-2 relative">
              Contests
              <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
            </h1>
            <p className="text-gray-300">Browse and join available contests</p>
          </div>

          {/* Enhanced Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Enhanced Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contests.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                  <div className="text-6xl mb-4 animate-bounce">⏳</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">No Contests Available</h3>
                  <p className="text-gray-300">Please check back later.</p>
                </div>
              ) : (
                contests.map((c, index) => (
                  <div 
                    key={c.id} 
                    className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/10 group cursor-pointer ${
                      hoveredContest === c.id ? 'bg-white/15 scale-105 shadow-lg shadow-green-400/20 border-green-400/50' : ''
                    }`}
                    onMouseEnter={() => setHoveredContest(c.id)}
                    onMouseLeave={() => setHoveredContest(null)}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                        hoveredContest === c.id ? 'text-green-400' : 'text-white group-hover:text-green-400'
                      }`}>
                        {c.name}
                      </h3>
                      <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm animate-pulse">
                        Active
                      </span>
                    </div>
                    
                    <p className="text-gray-300 mt-3 line-clamp-3 leading-relaxed">
                      {c.description || 'No description'}
                    </p>
                    
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between text-gray-300 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Length: <span className="text-white font-medium">{c.length} min</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                          Contest
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {joinedContestId === c.id ? (
                          <button
                            onClick={() => router.push(`/contests/${c.id}`)}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 relative overflow-hidden group/btn"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Contest
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </button>
                        ) : joinedContestId ? (
                          <button disabled className="px-6 py-3 bg-gray-600 text-white rounded-lg opacity-60 cursor-not-allowed flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Already in Contest
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinContest(c.id, c.name, c.length)}
                            disabled={joiningContest === c.id}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group/btn"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {joiningContest === c.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Joining...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Join Contest
                                </>
                              )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <ContestProblemsPreview contestId={c.id} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

function ContestProblemsPreview({ contestId }: { contestId: string }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hoveredProblem, setHoveredProblem] = useState<string | null>(null);
  
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/contests/${contestId}/problems`);
        const json = await res.json();
        if (res.ok) setItems((json.problems || []).slice(0, 3));
      } finally { setLoaded(true); }
    })();
  }, [contestId]);
  
  if (!loaded) return (
    <div className="mt-4 flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-400 text-sm">Loading problems...</span>
    </div>
  );
  
  if (items.length === 0) return (
    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        No problems yet
      </div>
    </div>
  );
  
  return (
    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium text-white text-sm">Problems ({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((p, index) => (
          <div 
            key={p.id}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
              hoveredProblem === p.id ? 'bg-green-400/10 border border-green-400/20' : 'hover:bg-white/5'
            }`}
            onMouseEnter={() => setHoveredProblem(p.id)}
            onMouseLeave={() => setHoveredProblem(null)}
            style={{ transitionDelay: `${index * 0.05}s` }}
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 text-sm truncate">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


