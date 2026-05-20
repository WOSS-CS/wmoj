'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { getContestStatus, formatTimeUntil } from '@/utils/contestStatus';
import type { ContestStatus } from '@/types/contest';

const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

interface ContestDetail {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_by: string;
  starts_at: string | null;
  ends_at: string | null;
  is_rated: boolean;
  is_active: boolean | null;
}

interface ContestProblem {
  id: string;
  name: string;
  points: number;
}

interface ContestViewClientProps {
  error?: string;
  initialContest?: ContestDetail;
  problems?: ContestProblem[];
}


const STATUS_VARIANT: Record<ContestStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  ongoing:  'success',
  upcoming: 'info',
  virtual:  'warning',
  inactive: 'neutral',
};

const STATUS_LABEL: Record<ContestStatus, string> = {
  ongoing:  'Ongoing',
  upcoming: 'Upcoming',
  virtual:  'Virtual',
  inactive: 'Inactive',
};

export default function ContestViewClient({ error, initialContest, problems = [] }: ContestViewClientProps) {
  const router = useRouter();
  const { user, session, userRole } = useAuth();
  const { startCountdown } = useCountdown();

  const isOwnContest = (userRole === 'admin' || userRole === 'manager') && user?.id === initialContest?.created_by;
  const isInactive = initialContest ? initialContest.is_active === false : false;

  const status: ContestStatus = initialContest
    ? getContestStatus({ is_active: initialContest.is_active !== false, starts_at: initialContest.starts_at, ends_at: initialContest.ends_at })
    : 'inactive';

  const [joining, setJoining] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleJoinClick = () => {
    if (!user) { setShowAuthPrompt(true); return; }
    handleJoin();
  };

  const handleJoin = async () => {
    if (!initialContest || joining || !user) return;
    try {
      setJoining(true);
      const res = await fetch(`/api/contests/${initialContest.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ userId: user?.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to join contest');
      startCountdown(initialContest.id, initialContest.name, initialContest.length);
      router.push(`/contests/${initialContest.id}`);
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'Failed to join contest');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      {showAuthPrompt && <AuthPromptModal message="Log in or sign up to join this contest and compete." onClose={() => setShowAuthPrompt(false)} />}
      <div className="max-w-4xl mx-auto space-y-6">
        {error ? (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-sm text-error mb-2">{error}</p>
            <Link href="/contests" className="text-sm text-error hover:underline">← Back to Contests</Link>
          </div>
        ) : initialContest ? (
          <>
            <Link href="/contests" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
              Back to Contests
            </Link>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{initialContest.name}</h1>
              <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
              {initialContest.is_rated && (
                <Badge variant="info">Rated</Badge>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="glass-panel p-6">
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">About this Contest</h2>
                  <div className="prose prose-invert max-w-none">
                    <MarkdownRenderer content={initialContest.description || '*No description provided*'} />
                  </div>
                </div>
              </div>

              <div>
                <div className="glass-panel p-5">
                  <div className="mb-5">
                    <div className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Duration</div>
                    <div className="text-2xl font-semibold text-foreground font-mono">
                      {initialContest.length} <span className="text-sm text-text-muted font-sans">min</span>
                    </div>
                  </div>

                  {isInactive ? (
                    <div className="w-full h-10 flex items-center justify-center text-sm text-text-muted border border-border rounded-lg bg-surface-2 cursor-not-allowed select-none">
                      Contest is inactive — not joinable
                    </div>
                  ) : isOwnContest ? (
                    <>
                      <div className="w-full h-10 flex items-center justify-center text-sm text-text-muted border border-border rounded-lg">
                        You created this contest
                      </div>
                      <p className="text-xs text-text-muted mt-3 text-center">
                        Creators cannot join their own contests.
                      </p>
                    </>
                  ) : status === 'upcoming' ? (
                    <>
                      <div className="w-full h-10 flex items-center justify-center text-sm text-text-muted border border-border rounded-lg bg-surface-2 cursor-not-allowed select-none">
                        Not yet open
                      </div>
                      {initialContest.starts_at && (
                        <p className="text-xs text-text-muted mt-3 text-center">
                          Starts {formatTimeUntil(initialContest.starts_at) || 'very soon'}
                        </p>
                      )}
                    </>
                  ) : status === 'virtual' ? (
                    <>
                      <button
                        onClick={handleJoinClick}
                        disabled={joining}
                        className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {joining ? <><LoadingSpinner size="sm" /><span>Joining...</span></> : 'Join (Virtual)'}
                      </button>
                      <p className="text-xs text-text-muted mt-3 text-center">
                        Virtual participation. Does not affect the leaderboard.
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleJoinClick}
                        disabled={joining}
                        className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {joining ? <><LoadingSpinner size="sm" /><span>Joining...</span></> : 'Join Contest'}
                      </button>
                      {initialContest.ends_at && formatTimeUntil(initialContest.ends_at) && (
                        <p className="text-xs text-text-muted mt-3 text-center">
                          Ends {formatTimeUntil(initialContest.ends_at)}
                        </p>
                      )}
                      {(!initialContest.ends_at || !formatTimeUntil(initialContest.ends_at)) && (
                        <p className="text-xs text-text-muted mt-3 text-center">
                          By joining, you agree to the contest rules.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {status === 'virtual' && problems.length > 0 && (
              <div className="glass-panel overflow-hidden">
                <div className="bg-surface-2 px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Problems</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    This contest has ended. Problems can be solved individually as practice.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {problems.map((problem, i) => (
                    <Link
                      key={problem.id}
                      href={`/problems/${problem.id}`}
                      className="flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors group"
                    >
                      <span className="text-sm font-medium text-foreground group-hover:text-brand-primary transition-colors">
                        {String.fromCharCode(65 + i)}. {problem.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-text-muted">{problem.points} pts</span>
                        <span className="text-xs text-brand-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Solve →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
