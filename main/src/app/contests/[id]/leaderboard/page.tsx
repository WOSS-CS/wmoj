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
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [contestName, setContestName] = useState<string>('Contest');

  useEffect(() => {
    (async () => {
      if (!params.id || !session?.access_token) return;
      try {
        const allowedRes = await fetch(`/api/contests/${params.id}/joined`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const allowedJson = await allowedRes.json();
        if (!allowedRes.ok || !allowedJson.allowed) { router.push('/contests'); return; }

        const [contestRes, lbRes] = await Promise.all([
          fetch(`/api/contests/${params.id}`),
          fetch(`/api/contests/${params.id}/leaderboard`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
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

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <RegularOnlyGuard>
        <div className="max-w-3xl mx-auto space-y-6">
          <Link href="/contests" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
            Back to Contests
          </Link>

          <div>
            <h1 className="text-xl font-semibold text-foreground mb-0.5">{contestName}</h1>
            <p className="text-sm text-text-muted">Final leaderboard</p>
          </div>

          <LoadingState isLoading={loading} skeleton={<LeaderboardLoading items={6} />}>
            {error ? (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            ) : (
              <div className="glass-panel p-5">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">The leaderboard is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${index === 0 ? 'bg-amber-400 text-black' :
                            index === 1 ? 'bg-slate-300 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                                'bg-surface-1 text-text-muted'
                            }`}>
                            #{entry.rank}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{entry.username}</div>
                            <div className="text-xs text-text-muted">Rank {entry.rank}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-brand-primary font-mono">{entry.total_score} pts</div>
                          <div className="text-xs text-text-muted font-mono">{entry.solved_problems}/{entry.total_problems}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </LoadingState>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
