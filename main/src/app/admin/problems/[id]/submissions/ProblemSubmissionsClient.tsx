'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { SubmissionCodeBlock } from '@/components/SubmissionCodeBlock';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useViewCode, type ViewCodeSubmission } from '@/hooks/useViewCode';
import {
  VERDICT_STYLES,
  VerdictBadge,
  aggregateVerdict,
  caseVerdict,
} from '@/components/VerdictBadge';
import type { TestResult } from '@/types/judge';
import type { ProblemSubmissionRow } from './page';

const LANGUAGE_DISPLAY: Record<string, string> = {
  python: 'Python',
  python3: 'Python 3',
  pypy3: 'PyPy 3',
  cpp: 'C++',
  cpp14: 'C++14 (GCC)',
  cpp17: 'C++17 (GCC)',
  cpp20: 'C++20 (GCC)',
  cpp23: 'C++23 (GCC)',
};
function displayLanguage(code: string): string {
  return LANGUAGE_DISPLAY[code] || code.toUpperCase();
}

type ListBadge = 'CE' | 'AC' | 'Failed';
function listBadgeFromRow(r: ProblemSubmissionRow): ListBadge {
  if (r.isCompileError) return 'CE';
  if (r.status === 'passed') return 'AC';
  return 'Failed';
}

// The list query deliberately omits `results` (AGENTS.md: never select code/results
// in a submission-list query), so at this point TLE, MLE, RE and WA are genuinely
// indistinguishable. Render the neutral "Failed" the dashboards already use rather
// than asserting a verdict we do not have — the row's modal derives the real one
// from `results`, fetched on demand, and the two must not contradict each other.
function FailedBadge() {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${VERDICT_STYLES.WA}`}
      title="Failed"
    >
      Failed
    </span>
  );
}

export default function ProblemSubmissionsClient({
  initialSubmissions,
  initialProblemName,
  currentPage,
  totalPages,
  totalCount,
}: {
  initialSubmissions: ProblemSubmissionRow[];
  initialProblemName: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const { session } = useAuth();
  const [selectedRow, setSelectedRow] = useState<ProblemSubmissionRow | null>(null);
  const problemName = initialProblemName;

  const currentParams: Record<string, string | undefined> = {};
  const { displayPage, isLoading, handlePageChange, buildHref } = usePaginatedNavigation({
    currentPage,
    totalPages,
    currentParams,
  });

  const { selected, loading: viewCodeLoading, open: openViewCode, close: closeViewCode } = useViewCode({
    buildUrl: (id) => `/api/admin/submissions/${id}`,
    getToken: () => session?.access_token,
  });

  const handleCloseViewCode = () => { closeViewCode(); setSelectedRow(null); };

  type Row = ProblemSubmissionRow;
  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'user', header: 'User', className: 'w-2/12', sortable: true, sortAccessor: (r) => (r.username || r.email).toLowerCase(), render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.username}</span>
          <span className="text-xs text-text-muted">{r.email}</span>
        </div>
      )
    },
    {
      key: 'status', header: 'Status', className: 'w-2/12', render: (r) => {
        const badge = listBadgeFromRow(r);
        if (badge === 'CE') return <VerdictBadge verdict="CE" />;
        if (badge === 'AC') return <VerdictBadge verdict="AC" />;
        return <FailedBadge />;
      }
    },
    { key: 'score', header: 'Score', className: 'w-2/12', render: (r) => <span className="text-text-muted font-mono">{r.summary?.passed ?? 0}/{r.summary?.total ?? 0}</span> },
    { key: 'language', header: 'Language', className: 'w-1/12', sortable: true, sortAccessor: (r) => r.language, render: (r) => <span className="text-xs font-mono bg-surface-2 px-2 py-0.5 rounded">{displayLanguage(r.language)}</span> },
    { key: 'created_at', header: 'Date', className: 'w-2/12', sortable: true, sortAccessor: (r) => new Date(r.created_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.created_at).toLocaleString()}</span> },
    {
      key: 'actions', header: 'Actions', className: 'w-3/12', render: (r) => (
        <button onClick={() => { setSelectedRow(r); openViewCode(r.id); }} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">View Code</button>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <Link href="/admin/problems/manage" className="text-sm text-text-muted hover:text-foreground">← Back to Problems</Link>
            <h1 className="text-xl font-semibold text-foreground mt-2">Submissions: {problemName}</h1>
            <p className="text-sm text-text-muted mt-1">View and manage user submissions for this problem.</p>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">All Submissions</h2>
              <span className="text-xs text-text-muted font-mono">{totalCount} total</span>
            </div>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildHref}
                displayPage={displayPage}
                loading={isLoading}
                onPageChange={handlePageChange}
              />
            </div>
            {initialSubmissions.length > 0 || isLoading ? (
              <DataTable<Row> columns={columns} rows={initialSubmissions} rowKey={(r) => r.id} loading={isLoading} skeletonRowCount={20} />
            ) : (
              <p className="text-sm text-text-muted text-center py-8">No submissions found for this problem.</p>
            )}
          </div>
        </div>

        {(viewCodeLoading || selected) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleCloseViewCode}>
            <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Submission Details</h2>
                  <p className="text-xs text-text-muted">
                    {selectedRow ? `by ${selectedRow.username} • ${new Date(selectedRow.created_at).toLocaleString()}` : 'Loading…'}
                  </p>
                </div>
                <button onClick={handleCloseViewCode} className="text-text-muted hover:text-foreground text-lg">×</button>
              </div>

              {viewCodeLoading && !selected ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <svg className="animate-spin text-brand-primary" width={28} height={28} viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                    <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              ) : selected ? (
                <SubmissionModalBody selected={selected} />
              ) : null}

              <div className="px-5 py-3 border-t border-border flex justify-end">
                <button onClick={handleCloseViewCode} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Close</button>
              </div>
            </div>
          </div>
        )}
      </AdminGuard>
    </AuthGuard>
  );
}

function SubmissionModalBody({ selected }: { selected: ViewCodeSubmission }) {
  const results = (selected.results || []) as TestResult[];
  const verdict = aggregateVerdict(results, selected.compileError);
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Verdict</div>
          <div className="mt-1">
            <VerdictBadge verdict={verdict} />
          </div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
          <div className="text-sm font-semibold text-foreground mt-1 font-mono">{selected.summary.passed}/{selected.summary.total}</div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
          <div className="text-sm font-semibold text-foreground mt-1">{displayLanguage(selected.language)}</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
        <div className="rounded-md overflow-hidden border border-border text-sm">
          <SubmissionCodeBlock language={selected.language} code={selected.code} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
        <div className="space-y-1.5">
          {results.map((r, i) => {
            const v = caseVerdict(r);
            return (
              <div key={i} className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <VerdictBadge verdict={v} />
                    <span className="text-sm font-medium text-foreground">Case #{i + 1}</span>
                  </div>
                  <span className="text-xs text-text-muted font-mono flex items-center gap-2">
                    {typeof r.timeMs === 'number' && <span>{r.timeMs}ms</span>}
                    {typeof r.memKb === 'number' && <span>{Math.round(r.memKb / 1024)}MB</span>}
                    <span>Exit: {r.exitCode ?? 'N/A'}</span>
                  </span>
                </div>
                {!r.passed && (r.expected || r.received) && (
                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
                    <div>
                      <div className="text-text-muted mb-0.5">Expected:</div>
                      <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-text-muted border border-border">{r.expected}</pre>
                    </div>
                    <div>
                      <div className="text-text-muted mb-0.5">Received:</div>
                      <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-error border border-border">{r.received}</pre>
                    </div>
                    {r.stderr && (
                      <div className="col-span-2">
                        <div className="text-text-muted mb-0.5">Stderr:</div>
                        <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-warning border border-border">{r.stderr}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}