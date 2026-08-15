'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CodeEditorLoading } from '@/components/LoadingStates';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { Problem } from '@/types/problem';
import { useCountdown } from '@/contexts/CountdownContext';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => <CodeEditorLoading lines={20} />,
});

interface SubmitClientProps {
  problem: Problem;
  activeContestId: string | null;
  isVirtualContest?: boolean;
}

type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'IE';

interface TestResult {
  index: number;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  passed: boolean;
  expected: string;
  received: string;
  // New optional fields from the rewritten judge (additive):
  verdict?: Verdict;
  timeMs?: number;
  cpuMs?: number;
  memKb?: number;
  // Present only on problems with a custom checker: the checker's own
  // explanation of why it accepted or rejected this case.
  checkerMessage?: string;
}

const languages = [
  { value: 'python3', label: 'Python 3' },
  { value: 'pypy3', label: 'PyPy 3' },
  { value: 'cpp14', label: 'C++14 (GCC)' },
  { value: 'cpp17', label: 'C++17 (GCC)' },
  { value: 'cpp20', label: 'C++20 (GCC)' },
  { value: 'cpp23', label: 'C++23 (GCC)' },
];

// Per-verdict badge styling. AC=green, WA=red, TLE=amber, MLE=purple,
// RE=dark-red, CE=gray, IE=black. We don't use the shared Badge component
// for this because its palette doesn't include purple/dark-red/black.
const VERDICT_STYLES: Record<Verdict, string> = {
  AC: 'bg-success/10 text-success border border-success/20',
  WA: 'bg-error/10 text-error border border-error/20',
  TLE: 'bg-warning/10 text-warning border border-warning/20',
  MLE: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  RE: 'bg-red-900/20 text-red-400 border border-red-900/30',
  CE: 'bg-surface-2 text-text-muted border border-border',
  IE: 'bg-black/30 text-foreground border border-border',
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${VERDICT_STYLES[verdict]}`}
      title={verdict}
    >
      {verdict}
    </span>
  );
}

// Aggregate per-submission verdict derivation, matching the spec:
// if compileError → 'CE'; else worst failure ranked TLE > MLE > RE > WA; else 'AC'.
function aggregateVerdict(
  results: TestResult[] | null | undefined,
  compileError?: string | null,
): Verdict {
  if (compileError) return 'CE';
  if (!results || results.length === 0) return 'IE';
  const rank: Verdict[] = ['TLE', 'MLE', 'RE', 'WA'];
  for (const v of rank) {
    if (results.some((r) => r.verdict === v)) return v;
  }
  // Fall back to derived verdicts for rows without an explicit verdict field
  // (should not happen for new judge traffic, but keeps the UI robust).
  for (const r of results) {
    if (!r.passed) {
      if (r.timedOut) return 'TLE';
      return 'WA';
    }
  }
  return 'AC';
}

export default function SubmitClient({ problem, activeContestId, isVirtualContest }: SubmitClientProps) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { isActive, contestId } = useCountdown();

  const [selectedLanguage, setSelectedLanguage] = useState('python3');
  const [codeText, setCodeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  // The problem's own checker failed to compile. Kept strictly separate from
  // compileError: this is a fault in how the problem is configured, not in the
  // submitted code, so it must never render as a CE against the student.
  const [checkerError, setCheckerError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeContestId || isVirtualContest) return;
    const countdownResolved = isActive !== undefined && (contestId !== null || !isActive);
    if (!countdownResolved) return;
    if (!isActive || (contestId && contestId !== activeContestId)) router.replace('/contests');
  }, [isActive, contestId, activeContestId, router, isVirtualContest]);

  const handleSubmit = async () => {
    if (!problem || !user || !codeText.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    setResults(null);
    setSummary(null);
    setCompileError(null);
    setCheckerError(null);
    try {
      const resp = await fetch(`/api/problems/${problem.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ language: selectedLanguage, code: codeText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Submission failed');
      setResults(data.results || []);
      setSummary(data.summary || null);
      setCompileError(data.compileError || null);
      setCheckerError(data.checkerError || null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const agg: Verdict | null = summary || compileError
    ? aggregateVerdict(results, compileError)
    : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link
          href={`/problems/${problem.id}`}
          className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-sm font-medium text-foreground truncate">{problem.name}</span>
      </div>

      {/* Editor + Action panel */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Editor */}
        <div className="glass-panel overflow-hidden">
          <CodeEditor
            language={selectedLanguage}
            value={codeText}
            onChange={setCodeText}
            height="calc(100vh - 160px)"
            autoFocus
          />
        </div>

        {/* Action panel */}
        <div className="glass-panel p-5 sticky top-20 space-y-4">
          {/* Language selector */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full h-9 px-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-primary"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Submit button */}
          {submitError && (
            <div className="bg-error/10 border border-error/20 text-error text-xs p-3 rounded-lg">{submitError}</div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!codeText.trim() || submitting}
            className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              <><LoadingSpinner size="sm" /><span>Submitting...</span></>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Submit Solution
              </>
            )}
          </button>

          {/* Results */}
          {(submitting || summary || compileError || checkerError) && (
            <div className="space-y-3">
              <div className="h-px bg-border" />
              {submitting ? (
                <div className="flex items-center gap-2 py-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-text-muted">Evaluating...</span>
                </div>
              ) : checkerError ? (
                <>
                  {/* Checker configuration fault. Deliberately NOT a CE: the
                      problem's own checker failed to compile, the submission
                      was never graded, and nothing was stored. Rendered as a
                      warning about the problem, never as a verdict badge
                      against the student. */}
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="text-xs font-semibold text-warning">Problem misconfigured</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      This problem&apos;s custom checker failed to compile, so your solution could not be graded.{' '}
                      <strong className="text-foreground">This is not an error in your code</strong> — nothing was recorded against you. Please let a WMOJ admin know.
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-text-muted hover:text-foreground">Technical details</summary>
                      <pre className="mt-1.5 p-2 rounded bg-surface-1 text-warning overflow-x-auto border border-border text-xs whitespace-pre-wrap">{checkerError}</pre>
                    </details>
                  </div>
                </>
              ) : compileError ? (
                <>
                  {/* Compile error panel */}
                  <div className="p-3 rounded-lg bg-surface-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <VerdictBadge verdict="CE" />
                      <span className="text-xs text-text-muted font-mono">Compile Error</span>
                    </div>
                    <pre className="p-2 rounded bg-surface-1 text-error overflow-x-auto border border-border text-xs whitespace-pre-wrap">{compileError}</pre>
                  </div>
                </>
              ) : summary ? (
                <>
                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-surface-2 space-y-3">
                    <div className="flex items-center justify-between">
                      {agg && <VerdictBadge verdict={agg} />}
                      <span className="text-sm font-mono font-semibold text-brand-primary">
                        {summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs text-text-muted mb-0.5">Tests Passed</div>
                        <div className="text-lg font-semibold text-foreground font-mono">
                          {summary.passed}<span className="text-text-muted mx-0.5">/</span>{summary.total}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-surface-1 rounded h-1 overflow-hidden">
                      <div
                        className={`h-full ${summary.failed === 0 ? 'bg-success' : 'bg-brand-primary'}`}
                        style={{ width: `${summary.total > 0 ? (summary.passed / summary.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Test case list */}
                  {results && results.length > 0 && (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                      {results.map((r) => {
                        // Prefer the judge-reported verdict; fall back to
                        // pass/fail + timedOut when missing (legacy rows).
                        const v: Verdict = r.verdict
                          ? r.verdict
                          : r.passed
                          ? 'AC'
                          : r.timedOut
                          ? 'TLE'
                          : 'WA';
                        return (
                          <div key={r.index} className="p-2.5 rounded-lg bg-surface-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <VerdictBadge verdict={v} />
                                <span className="text-xs text-foreground font-mono">Test {r.index + 1}</span>
                              </div>
                              <div className="text-xs text-text-muted font-mono flex items-center gap-2">
                                {typeof r.timeMs === 'number' && <span>{r.timeMs}ms</span>}
                                {typeof r.memKb === 'number' && <span>{Math.round(r.memKb / 1024)}MB</span>}
                                <span>exit {r.exitCode ?? 'N/A'}</span>
                              </div>
                            </div>
                            {/* Custom-checker problems only: the checker's own
                                reason for accepting or rejecting this case. */}
                            {r.checkerMessage && (
                              <div className="mt-2 text-xs font-mono">
                                <div className="text-text-muted mb-0.5">Checker</div>
                                <pre className="p-1.5 rounded bg-surface-1 text-foreground overflow-x-auto border border-border text-xs whitespace-pre-wrap">{r.checkerMessage}</pre>
                              </div>
                            )}
                            {!r.passed && v !== 'TLE' && v !== 'MLE' && (
                              <div className="mt-2 space-y-1.5 text-xs font-mono">
                                <div>
                                  <div className="text-text-muted mb-0.5">Expected</div>
                                  <pre className="p-1.5 rounded bg-surface-1 text-text-muted overflow-x-auto border border-border text-xs">{r.expected}</pre>
                                </div>
                                <div>
                                  <div className="text-text-muted mb-0.5">Received</div>
                                  <pre className="p-1.5 rounded bg-surface-1 text-error overflow-x-auto border border-border text-xs">{r.received}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
