'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Problem } from '@/types/problem';

export default function ProblemsPage() {
  const { user, signOut } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStandaloneProblems();
  }, []);

  const fetchStandaloneProblems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/problems/standalone');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problems');
      }

      setProblems(data.problems);
    } catch (err) {
      console.error('Error fetching problems:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch problems');
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
        {/* Circuit Pattern Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-20 w-32 h-0.5 bg-green-400"></div>
          <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-52 w-0.5 h-16 bg-green-400"></div>
          <div className="absolute top-36 left-52 w-24 h-0.5 bg-green-400"></div>
          <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full"></div>
          
          <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-40 right-20 w-0.5 h-20 bg-green-400"></div>
          <div className="absolute top-60 right-20 w-40 h-0.5 bg-green-400"></div>
          <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full"></div>
          
          <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-green-400"></div>
          <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-green-400"></div>
          <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
            >
              Dashboard
            </Link>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Practice Problems
            </h1>
            <p className="text-gray-300 text-lg">
              Solve standalone problems to improve your competitive programming skills
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchStandaloneProblems}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Problems List */}
          {!loading && !error && (
            <div className="space-y-6">
              {problems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">No Problems Available</h3>
                  <p className="text-gray-300">
                    There are no standalone problems available at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {problems.map((problem) => (
                    <div
                      key={problem.id}
                      className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-green-400/50 transition-all duration-300 flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-white flex-1">
                          {problem.name}
                        </h3>
                        <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm ml-2 flex-shrink-0">
                          Standalone
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto">
                        <div className="text-sm text-gray-400">
                          {problem.input.length} test case{problem.input.length !== 1 ? 's' : ''}
                        </div>
                        <Link
                          href={`/problems/${problem.id}`}
                          className="inline-block px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 text-sm"
                        >
                          Start Solving
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
