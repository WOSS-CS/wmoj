'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Problem } from '@/types/problem';
import { Comment } from '@/types/comment';
import { useContestMembershipGuard } from '@/hooks/useContestMembershipGuard';
import { Badge } from '@/components/ui/Badge';
import CommentsSection from '@/components/CommentsSection';

interface ProblemDetailClientProps {
  problem: Problem;
  /**
   * Server-computed. The test-case ARRAYS must never reach this component: they
   * are the answer key, and every prop of a client component is serialised into
   * the RSC flight payload. Only the count crosses the boundary.
   */
  testCaseCount: number | null;
  activeContestId: string | null;
  initialBestSummary: { total: number; passed: number; failed: number } | null;
  isVirtualContest?: boolean;
  initialComments: Comment[];
}

export default function ProblemDetailClient({ problem, testCaseCount, activeContestId, initialBestSummary, isVirtualContest, initialComments }: ProblemDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const bestSummary = initialBestSummary;

  useContestMembershipGuard(activeContestId, isVirtualContest);

  const handleSubmitClick = () => {
    if (!user) { setShowAuthPrompt(true); return; }
    router.push(`/problems/${problem.id}/submit`);
  };

  return (
    <>
      {showAuthPrompt && <AuthPromptModal message="Log in or sign up to submit your solution and track your progress." onClose={() => setShowAuthPrompt(false)} />}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push(activeContestId && !isVirtualContest ? `/contests/${activeContestId}` : '/problems')}
          className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to {activeContestId && !isVirtualContest ? 'Contest' : 'Problems'}
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h1 className="text-lg font-semibold text-foreground">{problem.name}</h1>
                {activeContestId && !isVirtualContest && (
                  <Badge variant="info">Contest</Badge>
                )}
              </div>

              {/* Description */}
              <div className="min-h-[400px] max-w-none">
                <MarkdownRenderer content={problem.content} copyableCodeBlocks />
              </div>
            </div>
            <CommentsSection problemId={problem.id} initialComments={initialComments} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-5 sticky top-20">
              <h2 className="text-sm font-medium text-foreground mb-4">Problem Details</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Test Cases</span>
                  <span className="text-foreground font-mono">{testCaseCount ?? '\u2014'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Points</span>
                  <span className="text-foreground font-mono">{problem.points} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Time Limit</span>
                  <span className="text-foreground font-mono">{problem.time_limit || 5000}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Memory</span>
                  <span className="text-foreground font-mono">{problem.memory_limit || 256}MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Added</span>
                  <span className="text-foreground font-mono">{problem.created_at ? new Date(problem.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              {user && bestSummary && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-2">Best Submission</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Both guards are on `total > 0`: a compile-error summary is
                          {0,0,0}, so `failed === 0` reads as a pass and the
                          percentage divides by zero and renders the literal "NaN%".
                          The server already skips zero-total summaries when picking
                          the best one; this keeps the render honest regardless. */}
                      <Badge variant={bestSummary.total > 0 && bestSummary.failed === 0 ? 'success' : 'warning'}>
                        {bestSummary.passed}/{bestSummary.total}
                      </Badge>
                    </div>
                    <span className="text-sm text-brand-primary font-mono font-medium">
                      {bestSummary.total > 0 ? Math.round((bestSummary.passed / bestSummary.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Submit + view submissions */}
              <div className="mt-5 pt-5 border-t border-border space-y-2">
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  className="w-full h-9 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Submit Solution
                </button>

                {/* Both deep links pass ids, not free text. `?user=`/`?problem=` were
                    resolved with an unanchored ilike, so "bob" matched "bobby" and a
                    problem named "Sum" matched "Summation" — other people's
                    submissions listed as your own. `?user_id=`/`?problem_id=` are
                    matched with .eq(). */}
                {user && (
                  <Link
                    href={`/submissions?user_id=${encodeURIComponent(user.id)}&problem_id=${encodeURIComponent(problem.id)}`}
                    className="w-full h-9 border border-border text-sm font-medium text-foreground rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Submissions
                  </Link>
                )}

                <Link
                  href={`/submissions?problem_id=${encodeURIComponent(problem.id)}`}
                  className="w-full h-9 border border-border text-sm font-medium text-foreground rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  All Submissions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
