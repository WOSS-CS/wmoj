'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LeaderboardLoading, LoadingState, SkeletonText } from '@/components/LoadingStates';

interface LeaderEntry {
  user_id: string;
  username: string;

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
        <div className="relative overflow-hidden w-full h-full">
          {/* Main Content */}
          <div className="max-w-5xl mx-auto px-6 py-12">

            {/* Header / Config Area */}
            <div className="flex justify-between items-center mb-6">
              <Link href="/contests" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 hover:translate-x-[-2px] transition-transform">
                ← Back to Contests
              </Link>
            </div>

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
                <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white font-heading relative inline-block mb-2">
                      {contestName}
                      <span className="block text-2xl text-brand-primary opacity-80">Leaderboard</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 max-w-xl">
                      This is a view-only leaderboard. The contest has ended or you are viewing it after participation.
                    </p>
                  </div>

                  <div className="glass-panel p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-heading text-white flex items-center gap-2">
                        Final Standings
                      </h2>
                    </div>

                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                        <h3 className="text-xl font-semibold text-white mb-2">No Submissions</h3>
                        <p className="text-gray-500">The leaderboard is empty.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                          <div key={entry.user_id} className="flex items-center justify-between bg-surface-2 rounded-xl p-5 border border-white/5 hover:border-brand-primary/20 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono shadow-lg ${index === 0 ? 'bg-yellow-400 text-black' :
                                index === 1 ? 'bg-gray-300 text-black' :
                                  index === 2 ? 'bg-orange-400 text-white' :
                                    'bg-surface-3 text-gray-400'
                                }`}>
                                {index < 3 ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ) : (
                                  `#${index + 1}`
                                )}
                              </div>
                              <div>
                                <div className="text-white font-bold">{entry.username}</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Rank {index + 1}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-brand-primary font-bold font-mono text-xl">{entry.total_score} <span className="text-sm text-gray-500">pts</span></div>
                              <div className="text-gray-500 text-xs font-mono">{entry.solved_problems}/{entry.total_problems} solved</div>
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
