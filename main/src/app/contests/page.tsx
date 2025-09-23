'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Contest } from '@/types/contest';

export default function ContestsPage() {
  const { user, signOut } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

  const handleSignOut = async () => { await signOut(); };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-20 w-32 h-0.5 bg-green-400"></div>
          <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-52 w-0.5 h-16 bg-green-400"></div>
          <div className="absolute top-36 left-52 w-24 h-0.5 bg-green-400"></div>
          <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full"></div>
        </div>

        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300">Dashboard</Link>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">{user?.user_metadata?.username || user?.email}</span>
            <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">Sign Out</button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Contests</h1>
            <p className="text-gray-300">Browse and join available contests</p>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contests.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">No Contests Available</h3>
                  <p className="text-gray-300">Please check back later.</p>
                </div>
              ) : (
                contests.map((c) => (
                  <div key={c.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-green-400/50 transition-all">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-semibold text-white">{c.name}</h3>
                      {c.is_active ? (
                        <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">Active</span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-400/20 text-gray-300 rounded-full text-sm">Inactive</span>
                      )}
                    </div>
                    <p className="text-gray-300 mt-3 line-clamp-3">{c.description || 'No description'}</p>
                    <div className="mt-4 flex items-center justify-between text-gray-300 text-sm">
                      <span>Length: <span className="text-white font-medium">{c.length} min</span></span>
                      <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all">View</button>
                    </div>
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


