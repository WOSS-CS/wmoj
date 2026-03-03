'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import dynamic from 'next/dynamic';
import { LoadingState, SkeletonText, LeaderboardLoading } from '@/components/LoadingStates';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { checkContestParticipation } from '@/utils/participationCheck';
import type { Contest } from '@/types/contest';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';

const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

export default function ContestPage() {
  const params = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const { stopCountdown } = useCountdown();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<{ id: string; name: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ user_id: string; username: string; email: string; total_score: number; solved_problems: number; total_problems: number; rank: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user || !params.id) return;
      try {
        const hasAccess = await checkContestParticipation(user.id, params.id);
        if (!hasAccess) { router.push('/contests'); return; }
        setAccessChecked(true);
      } catch { router.push('/contests'); }
    })();
  }, [user, params.id, router]);

  useEffect(() => {
    if (!accessChecked) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/contests/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load contest');
        setContest(json.contest);
        const resP = await fetch(`/api/contests/${params.id}/problems`);
        const jsonP = await resP.json();
        if (resP.ok) setProblems(jsonP.problems || []);
        const resL = await fetch(`/api/contests/${params.id}/leaderboard`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const jsonL = await resL.json();
        if (resL.ok) setLeaderboard(jsonL.leaderboard || []);
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load contest'); }
      finally { setLoading(false); }
    })();
  }, [params.id, accessChecked, session?.access_token]);

  const handleLeaveContest = async () => {
    if (!user || !params.id) return;
    try {
      setLeaving(true);
      const token = session?.access_token;
      const res = await fetch(`/api/contests/${params.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) { const json = await res.json(); throw new Error(json?.error || 'Failed to leave contest'); }
      stopCountdown();
      router.push('/contests');
    } catch (e) { toast.error('Error', e instanceof Error ? e.message : 'Failed to leave contest'); }
    finally { setLeaving(false); }
  };

  const handleLeaderboardToggle = async () => {
    if (!showLeaderboard) {
      setLeaderboardLoading(true);
      try {
        const res = await fetch(`/api/contests/${params.id}/leaderboard`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const json = await res.json();
        if (res.ok) setLeaderboard(json.leaderboard || []);
      } catch { } finally { setLeaderboardLoading(false); }
    }
    setShowLeaderboard(!showLeaderboard);
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back nav */}
          <Link href="/contests" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
            Back to Contests
          </Link>

          <LoadingState isLoading={loading} skeleton={
            <div className="space-y-6"><SkeletonText lines={3} width="60%" /><LeaderboardLoading items={5} /></div>
          }>
            {error ? (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            ) : (
              <>
                {/* Contest header */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h1 className="text-xl font-semibold text-foreground">{contest?.name}</h1>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="glass-panel p-5 mb-4">
                      <MarkdownRenderer content={contest?.description || '*No description provided*'} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-text-muted bg-surface-2 px-2.5 py-1 rounded-md border border-border">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {contest?.length} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-text-muted bg-surface-2 px-2.5 py-1 rounded-md border border-border">
                        {problems.length} problem{problems.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button onClick={handleLeaderboardToggle} className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:text-foreground hover:bg-surface-2">
                      {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
                    </button>
                    <button onClick={handleLeaveContest} disabled={leaving} className="px-4 py-2 text-sm border border-error/20 rounded-lg text-error hover:bg-error/10 flex items-center gap-2">
                      {leaving ? <LoadingSpinner size="sm" /> : null}
                      Leave
                    </button>
                  </div>
                </div>

                {/* Leaderboard */}
                {showLeaderboard && (
                  <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-foreground">Leaderboard</h2>
                      {leaderboardLoading && <LoadingSpinner size="sm" />}
                    </div>

                    {leaderboard.length === 0 ? (
                      <p className="text-sm text-text-muted text-center py-6">No submissions yet. Be the first!</p>
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
                                <div className="text-xs text-text-muted">{entry.email}</div>
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

                {/* Problems */}
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-4">Contest Problems</h2>
                  {problems.length === 0 ? (
                    <div className="glass-panel p-6 text-center">
                      <p className="text-sm text-text-muted">Problems will appear here when they&apos;re added.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {problems.map((p) => (
                        <Link key={p.id} href={`/problems/${p.id}`} className="flex items-center justify-between p-4 glass-panel hover:bg-surface-2 group">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <span className="text-xs text-text-muted group-hover:text-brand-primary">Solve →</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </LoadingState>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
