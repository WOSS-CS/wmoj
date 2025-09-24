'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import { Problem } from '@/types/problem';

export default function ProblemsPage() {
  const { user, signOut } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredProblem, setHoveredProblem] = useState<string | null>(null);

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
      const res = await fetch('/api/problems/standalone');
      const json = await res.json();
      if (res.ok) {
        setProblems(json.problems || []);
      } else {
        setError(json.error || 'Failed to fetch problems');
      }
    } catch (e) {
      setError('Failed to fetch problems');
    } finally {
      setLoading(false);
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
                  Practice Problems
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Solve standalone problems to improve your competitive programming skills
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
                <button
                  onClick={fetchStandaloneProblems}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25"
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
                      {problems.map((problem, index) => (
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
                              <p className="text-gray-400 text-sm line-clamp-2">
                                {problem.content?.substring(0, 100)}...
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">
                                Easy
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="px-3 py-1 bg-gray-400/20 text-gray-400 rounded-full text-sm">
                                Not Attempted
                              </span>
                            </div>
                            <div className="col-span-2">
                              <Link
                                href={`/problems/${problem.id}`}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25"
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
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}