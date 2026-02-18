'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, SkeletonText, CodeEditorLoading } from '@/components/LoadingStates';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { checkContestParticipation } from '@/utils/participationCheck';
import { useCountdown } from '@/contexts/CountdownContext';

export default function ProblemPage() {
  const routeParams = useParams<{ id: string }>();
  const problemId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const router = useRouter();
  const { user, signOut, session } = useAuth();
  const { isActive, contestId } = useCountdown();
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'results' | 'stats'>('description');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<Array<{
    index: number;
    exitCode: number | null;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    passed: boolean;
    expected: string;
    received: string;
  }> | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [bestSummary, setBestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  const fetchProblem = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/problems/${id}`, {
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problem');
      }

      setProblem(data.problem);
    } catch (err) {
      console.error('Error fetching problem:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch problem');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Submissions now go through a secure API route which enforces participation

  const fetchBestSubmission = useCallback(async (userId: string, problemId: string) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('summary')
        .eq('user_id', userId)
        .eq('problem_id', problemId);

      if (error) {
        console.error('Error loading best submission:', error);
        return;
      }

      if (!data || data.length === 0) {
        setBestSummary(null);
        return;
      }

      let best: { total: number; passed: number; failed: number } | null = null;
      for (const row of data) {
        const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
        if (!s) continue;
        const current = {
          total: Number(s.total ?? 0),
          passed: Number(s.passed ?? 0),
          failed: Number(s.failed ?? 0),
        };
        if (
          !best ||
          current.passed > best.passed ||
          (current.passed === best.passed && current.total > best.total)
        ) {
          best = current;
        }
      }
      setBestSummary(best);
    } finally {
      // no-op
    }
  }, []);

  useEffect(() => {
    // Wait for a session to exist so we can forward Authorization for contest problems
    if (problemId && session?.access_token) {
      fetchProblem(problemId);
    }
    setIsLoaded(true);
  }, [problemId, session?.access_token, fetchProblem]);

  // Check access permission for contest problems
  useEffect(() => {
    (async () => {
      if (!user || !problem) return;

      // If problem is part of a contest, check participation
      if (problem.contest) {
        try {
          const hasAccess = await checkContestParticipation(user.id, problem.contest);
          if (!hasAccess) {
            router.push('/problems');
            return;
          }
        } catch (error) {
          console.error('Error checking contest access:', error);
          router.push('/problems');
        }
      }
      setAccessChecked(true);
    })();
  }, [user, problem, router]);

  // If the countdown ends while on a contest problem, redirect to /contests
  useEffect(() => {
    // Only consider redirect logic for contest problems
    if (!problem?.contest) return;

    // Wait until countdown context has resolved whether a contest is active and which ID
    // Avoid redirecting while contestId is still null/undefined but countdown may still be initializing
    const countdownResolved = isActive !== undefined && (contestId !== null || !isActive);
    if (!countdownResolved) return;

    // If countdown is inactive for this problem's contest, or the active contest differs, redirect out
    if (!isActive || (contestId && contestId !== problem.contest)) {
      // Guard against repeated calls by only redirecting when we're currently on a contest problem
      router.replace('/contests');
    }
  }, [isActive, contestId, problem?.contest, router]);

  useEffect(() => {
    if (user?.id && problem?.id) {
      fetchBestSubmission(user.id, problem.id);
    }
  }, [user?.id, problem?.id, fetchBestSubmission]);



  const handleSignOut = async () => {
    await signOut();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCodeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem || !user || !codeFile) return;
    setSubmitting(true);
    setSubmitError('');
    setResults(null);
    setSummary(null);

    try {
      const code = await codeFile.text();
      const resp = await fetch(`/api/problems/${problem.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ language: selectedLanguage, code }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Submission failed');
      }
      setResults(data.results || []);
      setSummary(data.summary || null);
      await fetchBestSubmission(user.id, problem.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };



  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' }
  ];

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="relative overflow-hidden w-full h-full">
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header / Config Area */}
            <div className="flex justify-between items-center mb-6">
              <button
                type="button"
                onClick={() => router.push(problem?.contest ? `/contests/${problem.contest}` : '/problems')}
                className="px-4 py-2 text-sm text-text-muted hover:text-foreground flex items-center gap-2 hover:translate-x-[-2px] transition-transform"
              >
                ← Back to {problem?.contest ? 'Contest' : 'Problems'}
              </button>
            </div>

            {/* Enhanced Loading State */}
            <LoadingState
              isLoading={loading || !accessChecked}
              skeleton={
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface-1 rounded-2xl p-8 border border-white/5">
                      <SkeletonText lines={3} width="80%" />
                      <div className="mt-6 space-y-4">
                        <SkeletonText lines={5} />
                        <SkeletonText lines={3} width="60%" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-surface-1 rounded-2xl p-6 border border-white/5">
                      <SkeletonText lines={2} width="60%" />
                      <div className="mt-4 space-y-3">
                        <SkeletonText lines={1} width="40%" />
                        <SkeletonText lines={1} width="60%" />
                      </div>
                    </div>
                    <CodeEditorLoading lines={8} />
                  </div>
                </div>
              }
            >
              {(loading || !accessChecked) && (
                <div className="flex justify-center items-center py-12">
                  <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </LoadingState>

            {/* Enhanced Error State */}
            {error && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
                <p className="text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={() => router.push('/problems')}
                  className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                >
                  Back to Problems
                </button>
              </div>
            )}

            {/* Enhanced Problem Content */}
            {!loading && !error && problem && (
              <div className={`grid lg:grid-cols-3 gap-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* Enhanced Problem Description */}
                <div className="lg:col-span-2">
                  <div className="glass-panel p-8 transition-colors duration-300">
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <div className="relative">
                        <h1 className="text-3xl font-bold text-foreground font-heading">
                          {problem.name}
                        </h1>
                      </div>
                      <span className="px-3 py-1 bg-surface-2 text-brand-primary rounded-full text-xs font-mono uppercase tracking-wider">
                        {problem.contest ? 'Contest Problem' : 'Standalone'}
                      </span>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                      {[
                        { id: 'description', label: 'Description', icon: '' },
                        { id: 'stats', label: 'Stats', icon: '' },
                        { id: 'results', label: 'Results', icon: '' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as 'description' | 'results' | 'stats')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center ${activeTab === tab.id
                            ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                            : 'text-text-muted hover:text-foreground hover:bg-surface-2'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[400px]">
                      {activeTab === 'description' && (
                        <div className="prose prose-invert max-w-none prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/10">
                          <MarkdownRenderer content={problem.content} />
                        </div>
                      )}

                      {activeTab === 'results' && (
                        <div className="space-y-4">
                          {summary && results ? (
                            <div>
                              <div className="mb-4 flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${summary.failed === 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {summary.failed === 0 ? 'ALL PASSED' : 'SOME FAILED'}
                                </span>
                                <span className="text-text-muted text-sm">Score:</span>
                                <span className="text-foreground font-mono font-bold">{summary.passed}/{summary.total}</span>
                              </div>
                              <div className="space-y-3">
                                {results.map((r) => (
                                  <div key={r.index} className="p-4 rounded-lg bg-surface-2 border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${r.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-foreground font-mono text-sm">Test case {r.index + 1}</span>
                                      </div>
                                      <div className="text-xs text-text-muted font-mono">exit {r.exitCode}{r.timedOut ? ' · timed out' : ''}</div>
                                    </div>
                                    {!r.passed && (
                                      <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs font-mono">
                                        <div>
                                          <div className="text-text-muted mb-1">Expected</div>
                                          <pre className="p-2 rounded bg-surface-1 text-text-muted overflow-x-auto border border-border">{r.expected}</pre>
                                        </div>
                                        <div>
                                          <div className="text-text-muted mb-1">Received</div>
                                          <pre className="p-2 rounded bg-surface-1 text-red-500 overflow-x-auto border border-border">{r.received}</pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                              <div className="text-4xl mb-4 opacity-50">📊</div>
                              <p className="text-text-muted">No submission results yet</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'stats' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-surface-2 rounded-lg border border-border">
                              <div className="text-2xl font-bold text-foreground font-mono">{problem.input.length}</div>
                              <div className="text-xs text-text-muted uppercase tracking-wide">Test Cases</div>
                            </div>
                            <div className="p-4 bg-surface-2 rounded-lg border border-border">
                              <div className="text-2xl font-bold text-brand-primary">{problem.contest ? 'Contest' : 'Practice'}</div>
                              <div className="text-xs text-text-muted uppercase tracking-wide">Type</div>
                            </div>
                          </div>
                          {bestSummary && (
                            <div className="p-6 bg-surface-2 rounded-lg border border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-text-muted">Best Score</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${bestSummary.failed === 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {bestSummary.failed === 0 ? 'Perfect' : 'Partial'}
                                </span>
                              </div>
                              <div className="text-4xl font-bold text-foreground font-mono mb-4">{bestSummary.passed}/{bestSummary.total}</div>
                              <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-brand-primary h-full transition-all duration-500"
                                  style={{ width: `${(bestSummary.passed / bestSummary.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Code Submission Panel */}
                <div className="lg:col-span-1">
                  <div className="glass-panel p-6 sticky top-8">
                    <h2 className="text-lg font-bold text-foreground mb-6 font-heading flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                      Submit Solution
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Enhanced Language Selection */}
                      <div>
                        <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                          Language
                        </label>
                        <div className="relative">
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-primary transition-colors appearance-none cursor-pointer hover:bg-black/40"
                          >
                            {languages.map((lang) => (
                              <option key={lang.value} value={lang.value} className="bg-[#1a1a1a]">
                                {lang.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Enhanced File Upload */}
                      <div>
                        <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                          Source Code
                        </label>
                        <div className="relative group">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".py,.cpp,.java,.c,.h"
                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:uppercase file:bg-surface-2 file:text-brand-primary hover:file:bg-brand-primary hover:file:text-black cursor-pointer transition-all"
                          />
                        </div>
                        {codeFile && (
                          <div className="mt-2 p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-center gap-2">
                            <span className="text-xs text-brand-primary font-mono truncate">
                              {codeFile.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Submit Button */}
                      {submitError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                          {submitError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!codeFile || submitting}
                        className="w-full py-3 bg-brand-primary text-black rounded-lg font-bold hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:lift"
                      >
                        {submitting ? 'Submitting...' : 'Submit Solution'}
                      </button>
                    </form>

                    {/* New Results Display Area */}
                    {(submitting || summary) && (
                      <div className="mt-6 p-4 rounded-xl bg-surface-2 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                        {submitting ? (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-text-muted">Evaluating submission...</span>
                          </div>
                        ) : summary ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${summary.failed === 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                <span className={`text-sm font-bold uppercase tracking-wider ${summary.failed === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {summary.failed === 0 ? 'Accepted' : 'Failed'}
                                </span>
                              </div>
                              <button
                                onClick={() => setActiveTab('results')}
                                className="text-[10px] uppercase font-bold text-brand-primary hover:text-brand-secondary transition-colors"
                              >
                                View Detailed Results
                              </button>
                            </div>

                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Test Cases Passed</div>
                                <div className="text-2xl font-bold text-foreground font-mono">
                                  {summary.passed}<span className="text-text-muted mx-1">/</span>{summary.total}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Score</div>
                                <div className="text-xl font-bold text-brand-primary font-mono text-right">
                                  {Math.round((summary.passed / summary.total) * 100)}%
                                </div>
                              </div>
                            </div>

                            <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ease-out ${summary.failed === 0 ? 'bg-green-500' : 'bg-brand-primary'}`}
                                style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Enhanced Problem Stats */}
                    <div className="mt-8 pt-6 border-t border-border space-y-3">
                      <h3 className="text-foreground font-heading text-sm mb-4">Problem Details</h3>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Test Cases</span>
                        <span className="text-foreground font-mono">{problem.input.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Time Limit</span>
                        <span className="text-foreground font-mono">{problem.time_limit || 5000}ms</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Memory Limit</span>
                        <span className="text-foreground font-mono">{problem.memory_limit || 256}MB</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Added</span>
                        <span className="text-foreground font-mono">{new Date(problem.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
