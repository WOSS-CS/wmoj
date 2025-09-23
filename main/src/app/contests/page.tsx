'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Contest = {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at?: string;
  is_active?: boolean;
  participants?: string[] | null;
};

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/contests');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load contests');
        setContests(data.contests);
      } catch (e: any) {
        setError(e.message || 'Failed to load contests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const joinContest = async (contest: Contest) => {
    if (!user) { setError('Please sign in to join contests'); return; }
    try {
      const { error } = await supabase.rpc('join_contest', { p_contest_id: contest.id });
      if (error) throw error;
      // No participants info here; just optimistic message
      setError('');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as any).message) : 'Failed to join contest';
      setError(msg);
    }
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition">Dashboard</Link>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-4xl font-bold text-white mb-6">Contests</h1>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
          )}

          {!loading && !error && (
            <div className="grid md:grid-cols-3 gap-6">
              {contests.length === 0 ? (
                <div className="md:col-span-3 text-gray-300">No contests available.</div>
              ) : (
                contests.map((c) => (
                  <div key={c.id} className="p-6 bg-white/10 border border-white/20 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold text-white">{c.name}</h3>
                      {c.is_active === false && (
                        <span className="px-2 py-1 text-xs rounded bg-yellow-400/20 text-yellow-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-4">{c.description || 'No description'}</p>
                    <div className="text-gray-400 text-sm mb-4">Length: {c.length} minutes</div>
                    <div className="flex gap-2">
                      <Link href={`/contests/${c.id}`} className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-center">View Details</Link>
                      <button
                        onClick={() => joinContest(c)}
                        disabled={!user}
                        className="py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        Join
                      </button>
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


