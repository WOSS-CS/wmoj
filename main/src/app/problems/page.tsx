'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import { Logo } from '@/components/Logo';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';

export default function ProblemsPage() {
  const { user, signOut } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredProblem, setHoveredProblem] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusByProblem, setStatusByProblem] = useState<Record<string, 'solved' | 'attempted' | 'not_attempted'>>({});

  useEffect(() => {
    fetchStandaloneProblems();
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fetchStandaloneProblems = async () => {
    try {
      setLoading(true);
      console.log('Fetching standalone problems...');
      const res = await fetch('/api/problems/standalone');
      const json = await res.json();
      console.log('API response:', { status: res.status, data: json });
      if (res.ok) {
        setProblems(json.problems || []);
        console.log('Problems set:', json.problems?.length || 0);
      } else {
        setError(json.error || 'Failed to fetch problems');
        console.error('API error:', json.error);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch problems');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  // Build a per-problem status map (solved/attempted/not_attempted)
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        if (!user?.id || problems.length === 0) {
          setStatusByProblem({});
          return;
        }
        const problemIds = problems.map(p => p.id);
        const { data, error } = await supabase
          .from('submissions')
          .select('problem_id, summary')
          .eq('user_id', user.id)
          .in('problem_id', problemIds);
        if (error) {
          console.error('Status load error:', error);
          return;
        }
        const map: Record<string, 'solved' | 'attempted' | 'not_attempted'> = {};
        // Default all to not_attempted
        for (const id of problemIds) map[id] = 'not_attempted';
        // Aggregate by problem
        const perProblem: Record<string, { any: boolean; solved: boolean }> = {};
        for (const row of data || []) {
          const pid = row.problem_id as string;
          const s = (row.summary || {}) as { total?: number; passed?: number; failed?: number };
          const total = Number(s.total ?? 0);
          const passed = Number(s.passed ?? 0);
          const failed = Number(s.failed ?? 0);
          const solved = total > 0 && failed === 0 && passed === total;
          if (!perProblem[pid]) perProblem[pid] = { any: false, solved: false };
          perProblem[pid].any = true;
          perProblem[pid].solved = perProblem[pid].solved || solved;
        }
        for (const [pid, agg] of Object.entries(perProblem)) {
          map[pid] = agg.solved ? 'solved' : 'attempted';
        }
        setStatusByProblem(map);
      } catch (e) {
        console.error('Unexpected status calc error:', e);
      }
    };
    loadStatuses();
  }, [user?.id, problems]);

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q)
    );
  }, [problems, search]);

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
            <span className="px-4 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm">
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
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-white mb-6">Problems</h2>
              <nav className="space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Overview
                </Link>
                <Link href="/problems" className="flex items-center gap-3 px-4 py-3 text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
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
                  Practice Problems
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Solve standalone problems to improve your competitive programming skills
                </p>
              </div>
            </LoadingState>

            {/* Data Loading Indicator (shows only while loading) */}
            {loading && (
              <div className="py-6">
                <CardLoading count={6} />
                <div className="flex justify-center items-center py-8">
                  <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin" aria-label="Loading problems" />
                </div>
              </div>
            )}

            {/* Enhanced Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchStandaloneProblems}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Problems List */}
            {!loading && !error && (
              <div className="space-y-4">
                {problems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">📝</div>
                    <h3 className="text-2xl font-semibold text-white mb-2">No Problems Available</h3>
                    <p className="text-gray-300">
                      There are no standalone problems available at the moment.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search Bar */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-4">
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search problems by name..."
                        className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                    </div>

                    {filteredProblems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-semibold text-white mb-2">No Problems Found</h3>
                        <p className="text-gray-300">
                          No problems match your search criteria. Try a different search term.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-300">
                        <div className="col-span-6">Problem</div>
                        <div className="col-span-2">Difficulty</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Actions</div>
                      </div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="divide-y divide-white/10">
                      {filteredProblems.map((problem, index) => (
                        <div
                          key={problem.id}
                          className={`px-6 py-4 hover:bg-white/5 transition-all duration-300 ${
                            hoveredProblem === problem.id ? 'bg-white/10' : ''
                          }`}
                          onMouseEnter={() => setHoveredProblem(problem.id)}
                          onMouseLeave={() => setHoveredProblem(null)}
                          style={{ transitionDelay: `${index * 0.05}s` }}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-6">
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {problem.name}
                              </h3>
                            </div>
                            <div className="col-span-2">
                              <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">
                                Easy
                              </span>
                            </div>
                            <div className="col-span-2">
                            {(() => {
                              const status = statusByProblem[problem.id] || 'not_attempted';
                              if (status === 'solved') {
                                return <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">Solved</span>;
                              }
                              if (status === 'attempted') {
                                return <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-sm">Attempted</span>;
                              }
                              return <span className="px-3 py-1 bg-gray-400/20 text-gray-400 rounded-full text-sm">Not Attempted</span>;
                            })()}
                            </div>
                            <div className="col-span-2">
                              <Link
                                href={`/problems/${problem.id}`}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-300"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Start Solving
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
