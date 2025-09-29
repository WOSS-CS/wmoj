'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LeaderboardLoading, LoadingState, SkeletonText } from '@/components/LoadingStates';
import { Logo } from '@/components/Logo';

interface LeaderEntry {
  user_id: string;
  username: string;
  email: string;
  total_score: number;
  solved_problems: number;
  total_problems: number;
  rank: number;
}

export default function ContestLeaderboardOnlyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [contestName, setContestName] = useState<string>('Contest');

  useEffect(() => {
    (async () => {
      if (!params.id || !session?.access_token) return;
      try {
        // Guard access: only previously joined participants can view
        const allowedRes = await fetch(`/api/contests/${params.id}/joined`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const allowedJson = await allowedRes.json();
        if (!allowedRes.ok || !allowedJson.allowed) {
          router.push('/contests');
          return;
        }
        // Load contest meta and leaderboard
        const [contestRes, lbRes] = await Promise.all([
          fetch(`/api/contests/${params.id}`),
          fetch(`/api/contests/${params.id}/leaderboard`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);
        const contestJson = await contestRes.json();
        if (contestRes.ok && contestJson.contest?.name) setContestName(contestJson.contest.name);
        const lbJson = await lbRes.json();
        if (!lbRes.ok) throw new Error(lbJson.error || 'Failed to load leaderboard');
        setLeaderboard(lbJson.leaderboard || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, session?.access_token, router]);

  const handleSignOut = async () => { await signOut(); };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <RegularOnlyGuard>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
          <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex gap-4">
              <Link href="/contests" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-colors duration-300">All Contests</Link>
              <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-colors duration-300">{user?.user_metadata?.username || user?.email}</span>
              <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300">Sign Out</button>
            </div>
          </nav>

          <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
            <LoadingState
              isLoading={loading}
              skeleton={
                <div className="space-y-6">
                  <SkeletonText lines={2} width="50%" />
                  <LeaderboardLoading items={6} />
                </div>
              }
            >
              {error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white">{contestName} — Leaderboard</h1>
                    <p className="text-gray-400 text-sm mt-1">View-only leaderboard. Problems are not visible after your time is up.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🏁</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Submissions Yet</h3>
                        <p className="text-gray-400">Check back later!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                          <div key={entry.user_id} className="flex items-center justify-between bg-white/5 rounded-xl p-5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-white font-semibold">{entry.username}</div>
                                <div className="text-gray-400 text-xs">{entry.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold">{entry.total_score} pts</div>
                              <div className="text-gray-400 text-xs">{entry.solved_problems}/{entry.total_problems} solved</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </LoadingState>
          </div>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
