'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonText, CodeEditorLoading } from '@/components/LoadingStates';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { useCountdown } from '@/contexts/CountdownContext';
import { Badge } from '@/components/ui/Badge';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => <CodeEditorLoading lines={12} />,
});

interface ProblemDetailClientProps {
  problem: Problem;
  initialBestSummary: { total: number; passed: number; failed: number } | null;
}

export default function ProblemDetailClient({ problem, initialBestSummary }: ProblemDetailClientProps) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { isActive, contestId } = useCountdown();
  const [activeTab, setActiveTab] = useState<'description' | 'results' | 'editor'>('description');
  
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeText, setCodeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<Array<{
    index: number; exitCode: number | null; timedOut: boolean;
    stdout: string; stderr: string; passed: boolean; expected: string; received: string;
  }> | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [bestSummary, setBestSummary] = useState<{ total: number; passed: number; failed: number } | null>(initialBestSummary);

  const fetchBestSubmission = useCallback(async (userId: string, problemId: string) => {
    try {
      const { data, error } = await supabase.from('submissions').select('summary').eq('user_id', userId).eq('problem_id', problemId);
      if (error || !data || data.length === 0) { setBestSummary(null); return; }
      let best: { total: number; passed: number; failed: number } | null = null;
      for (const row of data) {
        const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
        if (!s) continue;
        const current = { total: Number(s.total ?? 0), passed: Number(s.passed ?? 0), failed: Number(s.failed ?? 0) };
        if (!best || current.passed > best.passed || (current.passed === best.passed && current.total > best.total)) best = current;
      }
      setBestSummary(best);
    } catch (e) { 
      console.error('Failed to fetch best submission', e); 
    }
  }, []);

  useEffect(() => {
    if (!problem?.contest) return;
    const countdownResolved = isActive !== undefined && (contestId !== null || !isActive);
    if (!countdownResolved) return;
    if (!isActive || (contestId && contestId !== problem.contest)) router.replace('/contests');
  }, [isActive, contestId, problem?.contest, router]);

  const handleSubmitClick = () => {
    if (!user) { setShowAuthPrompt(true); return; }
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!problem || !user || !codeText.trim()) return;
    setSubmitting(true); setSubmitError(''); setResults(null); setSummary(null);
    try {
      const resp = await fetch(`/api/problems/${problem.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ language: selectedLanguage, code: codeText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Submission failed');
      setResults(data.results || []); setSummary(data.summary || null); setActiveTab('results');
      await fetchBestSubmission(user.id, problem.id);
    } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' }
  ];

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'results', label: 'Results' },
    { id: 'editor', label: 'Editor' },
  ] as const;

  return (
    <>
      {showAuthPrompt && <AuthPromptModal message="Log in or sign up to submit your solution and track your progress." onClose={() => setShowAuthPrompt(false)} />}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push(problem?.contest ? `/contests/${problem.contest}` : '/problems')}
          className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to {problem?.contest ? 'Contest' : 'Problems'}
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h1 className="text-lg font-semibold text-foreground">{problem.name}</h1>
                <Badge variant={problem.contest ? 'info' : 'neutral'}>
                  {problem.contest ? 'Contest' : 'Standalone'}
                </Badge>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 border-b border-border pb-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === tab.id
                      ? 'bg-surface-2 text-foreground'
                      : 'text-text-muted hover:text-foreground'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="min-h-[400px]">
                {activeTab === 'description' && (
                  <div className="max-w-none">
                    <MarkdownRenderer content={problem.content} />
                  </div>
                )}

                {activeTab === 'results' && (
                  <div className="space-y-3">
                    {summary && results ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <Badge variant={summary.failed === 0 ? 'success' : 'warning'}>
                            {summary.failed === 0 ? 'All Passed' : 'Some Failed'}
                          </Badge>
                          <span className="text-sm text-text-muted">
                            Score: <span className="text-foreground font-mono font-medium">{summary.passed}/{summary.total}</span>
                          </span>
                        </div>
                        <div className="space-y-2">
                          {results.map((r) => (
                            <div key={r.index} className="p-3 rounded-lg bg-surface-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${r.passed ? 'bg-success' : 'bg-error'}`} />
                                  <span className="text-sm text-foreground font-mono">Test {r.index + 1}</span>
                                </div>
                                <span className="text-xs text-text-muted font-mono">exit {r.exitCode}{r.timedOut ? ' · TLE' : ''}</span>
                              </div>
                              {!r.passed && (
                                <div className="mt-2 grid md:grid-cols-2 gap-2 text-xs font-mono">
                                  <div>
                                    <div className="text-text-muted mb-1">Expected</div>
                                    <pre className="p-2 rounded bg-surface-1 text-text-muted overflow-x-auto border border-border">{r.expected}</pre>
                                  </div>
                                  <div>
                                    <div className="text-text-muted mb-1">Received</div>
                                    <pre className="p-2 rounded bg-surface-1 text-error overflow-x-auto border border-border">{r.received}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-sm text-text-muted">No submission results yet. Write code and submit.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'editor' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-text-muted">Language</label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="h-8 px-2 bg-surface-2 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-brand-primary"
                      >
                        {languages.map((lang) => (
                          <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                    </div>

                    <CodeEditor language={selectedLanguage} value={codeText} onChange={setCodeText} height="500px" />

                    {submitError && (
                      <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-lg">{submitError}</div>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmitClick}
                      disabled={!codeText.trim() || submitting}
                      className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? <><LoadingSpinner size="sm" /><span>Submitting...</span></> : 'Submit Solution'}
                    </button>

                    {/* Inline result summary */}
                    {(submitting || summary) && (
                      <div className="p-4 rounded-lg bg-surface-2">
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-sm text-text-muted">Evaluating...</span>
                          </div>
                        ) : summary ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={summary.failed === 0 ? 'success' : 'error'}>
                                  {summary.failed === 0 ? 'Accepted' : 'Failed'}
                                </Badge>
                              </div>
                              <button onClick={() => setActiveTab('results')} className="text-xs text-brand-primary hover:text-brand-secondary font-medium">
                                View Details
                              </button>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-xs text-text-muted mb-0.5">Tests Passed</div>
                                <div className="text-lg font-semibold text-foreground font-mono">{summary.passed}<span className="text-text-muted mx-0.5">/</span>{summary.total}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-text-muted mb-0.5">Score</div>
                                <div className="text-base font-semibold text-brand-primary font-mono">{Math.round((summary.passed / summary.total) * 100)}%</div>
                              </div>
                            </div>
                            <div className="w-full bg-surface-1 rounded h-1 overflow-hidden">
                              <div className={`h-full ${summary.failed === 0 ? 'bg-success' : 'bg-brand-primary'}`} style={{ width: `${(summary.passed / summary.total) * 100}%` }} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-5 sticky top-20">
              <h2 className="text-sm font-medium text-foreground mb-4">Problem Details</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Test Cases</span>
                  <span className="text-foreground font-mono">{problem.input.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Difficulty</span>
                  <Badge variant={
                    (problem.difficulty?.toLowerCase() === 'hard' ? 'error' :
                      problem.difficulty?.toLowerCase() === 'medium' ? 'warning' : 'success') as any
                  }>
                    {problem.difficulty || 'Easy'}
                  </Badge>
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
                  <span className="text-foreground font-mono">{new Date(problem.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {user && bestSummary && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-2">Best Submission</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={bestSummary.failed === 0 ? 'success' : 'warning'}>
                        {bestSummary.passed}/{bestSummary.total}
                      </Badge>
                    </div>
                    <span className="text-sm text-brand-primary font-mono font-medium">
                      {Math.round((bestSummary.passed / bestSummary.total) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
