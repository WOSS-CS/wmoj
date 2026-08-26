'use client';

import Link from 'next/link';

interface LeaderEntry {
  user_id: string;
  username: string;
  total_score: number;
  solved_problems: number;
  total_problems: number;
  rank: number;
}

interface LeaderboardClientProps {
  error?: string;
  contestName: string;
  initialLeaderboard?: LeaderEntry[];
}

export default function ContestLeaderboardClient({ error, contestName, initialLeaderboard = [] }: LeaderboardClientProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/contests" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        Back to Contests
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground mb-0.5">{contestName}</h1>
        <p className="text-sm text-text-muted">Final leaderboard</p>
      </div>

      {error ? (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      ) : (
        <div className="glass-panel p-5">
          {initialLeaderboard.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">The leaderboard is empty.</p>
          ) : (
            <div className="space-y-2">
              {initialLeaderboard.map((entry, index) => (
                <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      index === 0 ? 'bg-amber-400 text-black' :
                      index === 1 ? 'bg-slate-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-surface-1 text-text-muted'
                    }`}>
                      #{entry.rank}
                    </div>
                    <div className="text-sm font-medium text-foreground">{entry.username}</div>
                  </div>
                  <div className="text-right">
                    {/* Not point-weighted: each problem contributes at most 1.0,
                        so this is a raw score, never "pts". Partial scores are
                        fractions and must be rounded for display. */}
                    <div className="text-sm font-semibold text-brand-primary font-mono">{entry.total_score.toFixed(2)}</div>
                    <div className="text-xs text-text-muted font-mono">{entry.solved_problems}/{entry.total_problems} solved</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
