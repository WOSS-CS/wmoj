'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { SubmissionCodeBlock } from '@/components/SubmissionCodeBlock';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useViewCode, type ViewCodeSubmission } from '@/hooks/useViewCode';
import type { UserSubmissionRow } from './page';

type TestResult = {
  index: number; passed: boolean; stdout: string; stderr: string;
  exitCode: number | null; timedOut: boolean; expected: string; received: string;
  verdict?: string; timeMs?: number; cpuMs?: number; memKb?: number;
};

type Row = UserSubmissionRow;

interface UserInfo {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface ManagerUserDetailClientProps {
  user: UserInfo;
  initialIsAdmin: boolean;
  initialIsManager: boolean;
  currentUserId: string;
  initialSubmissions: Row[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
}

export default function ManagerUserDetailClient({
  user,
  initialIsAdmin,
  initialIsManager,
  currentUserId,
  initialSubmissions,
  currentPage,
  totalPages,
  totalCount,
  totalSubmissions,
  acceptedSubmissions,
}: ManagerUserDetailClientProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [isManager, setIsManager] = useState(initialIsManager);
  const [promoting, setPromoting] = useState(false);
  const [promotingManager, setPromotingManager] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const isSelf = currentUserId === user.id;

  const acceptanceRate = totalSubmissions > 0
    ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
    : 0;

  const currentParams: Record<string, string | undefined> = {};
  const { displayPage, isLoading, handlePageChange, buildHref } = usePaginatedNavigation({
    currentPage,
    totalPages,
    currentParams,
  });

  const { selected, loading: viewCodeLoading, open: openViewCode, close: closeViewCode } = useViewCode({
    buildUrl: (id) => `/api/manager/submissions/${id}`,
    getToken: () => session?.access_token,
  });

  const handleCloseViewCode = () => { closeViewCode(); setSelectedRow(null); };

  const displayName = user.username || user.email || 'User';
  const avatarLetter = displayName[0].toUpperCase();

  const handlePromote = async (promote: boolean) => {
    setPromoting(true);
    try {
      const res = await fetch(`/api/manager/users/${user.id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ promote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setIsAdmin(data.isAdmin);
      toast.success(promote ? 'User promoted to Admin' : 'User demoted to User');
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPromoting(false);
    }
  };

  const handlePromoteManager = async (promote: boolean) => {
    setPromotingManager(true);
    try {
      const res = await fetch(`/api/manager/users/${user.id}/promote-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ promote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setIsManager(data.isManager);
      // Manager supersedes admin, so promotion drops any `admins` row. Without
      // reflecting that here the row is still an admin while the UI hides the
      // "Demote from Admin" control behind the manager branch.
      setIsAdmin(!!data.isAdmin);
      toast.success(promote ? 'User promoted to Manager' : 'User demoted from Manager');
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPromotingManager(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const languageLabels: Record<string, string> = {
    python: 'Python',
    python3: 'Python 3',
    pypy3: 'PyPy 3',
    cpp: 'C++',
    cpp14: 'C++14 (GCC)',
    cpp17: 'C++17 (GCC)',
    cpp20: 'C++20 (GCC)',
    cpp23: 'C++23 (GCC)',
  };

  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'problem',
      header: 'Problem',
      className: 'w-[25%]',
      sortable: true,
      sortAccessor: (r) => r.problem.toLowerCase(),
      render: (r) => <span className="text-foreground font-medium">{r.problem}</span>,
    },
    {
      key: 'language',
      header: 'Language',
      className: 'w-[15%]',
      sortable: true,
      sortAccessor: (r) => r.language,
      render: (r) => (
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
          {languageLabels[r.language] || r.language}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      className: 'w-[15%]',
      sortable: true,
      sortAccessor: (r) => {
        const parts = r.score.split('/');
        if (parts.length !== 2) return -1;
        return Number(parts[0]) / Number(parts[1]);
      },
      render: (r) => <span className="text-foreground font-mono text-sm">{r.score}</span>,
    },
    {
      key: 'result',
      header: 'Result',
      className: 'w-[15%]',
      sortable: true,
      sortAccessor: (r) => (r.passed ? 1 : 0),
      render: (r) => {
        if (r.compileError) return <Badge variant="neutral">CE</Badge>;
        return <Badge variant={r.passed ? 'success' : 'error'}>{r.passed ? 'Accepted' : 'Failed'}</Badge>;
      },
    },
    {
      key: 'when',
      header: 'Submitted',
      className: 'w-[15%]',
      sortable: true,
      sortAccessor: (r) => new Date(r.timestamp).getTime(),
      render: (r) => (
        <span className="text-text-muted text-sm font-mono" title={formatDate(r.timestamp)}>
          {formatTimeAgo(r.timestamp)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[15%]',
      render: (r) => (
        <button
          onClick={() => { setSelectedRow(r); openViewCode(r.id); }}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
        >
          View Code
        </button>
      ),
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/manager/usermanagement')}
              className="text-text-muted hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-foreground">User Details</h1>
          </div>

          {/* Profile card */}
          <div className="bg-surface-1 border border-border rounded-lg p-5 flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-semibold text-brand-primary">{avatarLetter}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-foreground">{user.username || '—'}</p>
              <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={isManager ? 'accent' : isAdmin ? 'info' : 'neutral'}>
                  {isManager ? 'Manager' : isAdmin ? 'Admin' : 'User'}
                </Badge>
                <Badge variant={user.is_active ? 'success' : 'warning'}>
                  {user.is_active ? 'Active' : 'Disabled'}
                </Badge>
                <span className="text-xs text-text-muted">
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Promote / Demote actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {isManager ? (
                !isSelf && (
                  <button
                    onClick={() => handlePromoteManager(false)}
                    disabled={promotingManager}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {promotingManager ? 'Updating...' : 'Demote from Manager'}
                  </button>
                )
              ) : (
                <>
                  {isAdmin ? (
                    <button
                      onClick={() => handlePromote(false)}
                      disabled={promoting}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {promoting ? 'Updating...' : 'Demote from Admin'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePromote(true)}
                      disabled={promoting}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {promoting ? 'Updating...' : 'Promote to Admin'}
                    </button>
                  )}
                  <button
                    onClick={() => handlePromoteManager(true)}
                    disabled={promotingManager}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {promotingManager ? 'Updating...' : 'Promote to Manager'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-1 border border-border rounded-lg p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Submissions</p>
              <p className="text-2xl font-semibold text-foreground mt-1 font-mono">{totalSubmissions}</p>
            </div>
            <div className="bg-surface-1 border border-border rounded-lg p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Accepted</p>
              <p className="text-2xl font-semibold text-success mt-1 font-mono">{acceptedSubmissions}</p>
            </div>
            <div className="bg-surface-1 border border-border rounded-lg p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Acceptance Rate</p>
              <p className="text-2xl font-semibold text-foreground mt-1 font-mono">{acceptanceRate}%</p>
            </div>
          </div>

          {/* Submissions section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Submissions</h2>
              <span className="text-xs text-text-muted font-mono">{totalCount} total</span>
            </div>
            <div className="glass-panel overflow-hidden">
              <div className="bg-surface-2 px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Submissions</h2>
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
              {totalCount > 0 || isLoading ? (
                <DataTable<Row> columns={columns} rows={initialSubmissions} rowKey={(r) => r.id} loading={isLoading} skeletonRowCount={20} />
              ) : (
                <p className="text-sm text-text-muted py-8 text-center">No submissions found for this user.</p>
              )}
            </div>
          </div>

        </div>

        {(viewCodeLoading || selected) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleCloseViewCode}>
            <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Submission Details</h2>
                  <p className="text-xs text-text-muted">
                    {selectedRow ? `by ${displayName} • ${selectedRow.problem} • ${formatDate(selectedRow.timestamp)}` : 'Loading…'}
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

      </ManagerGuard>
    </AuthGuard>
  );
}

function SubmissionModalBody({ selected }: { selected: ViewCodeSubmission }) {
  const results = (selected.results || []) as TestResult[];
  const isAccepted = selected.summary.total > 0 && selected.summary.failed === 0;
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Status</div>
          <div className={`text-sm font-semibold mt-1 ${isAccepted ? 'text-success' : 'text-error'}`}>
            {selected.compileError ? 'Compile Error' : isAccepted ? 'Accepted' : 'Failed'}
          </div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
          <div className="text-sm font-semibold text-foreground mt-1 font-mono">{selected.summary.passed}/{selected.summary.total}</div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
          <div className="text-sm font-semibold text-foreground mt-1 uppercase">{selected.language}</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
        <div className="rounded-md overflow-hidden border border-border text-sm">
          <SubmissionCodeBlock language={selected.language} code={selected.code} />
        </div>
      </div>

      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {r.verdict && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-surface-2 text-text-muted border border-border">{r.verdict}</span>}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}