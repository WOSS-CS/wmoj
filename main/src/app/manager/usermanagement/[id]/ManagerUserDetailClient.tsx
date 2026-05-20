'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { SubmissionCodeBlock } from '@/components/SubmissionCodeBlock';

type TestResult = {
  index: number; passed: boolean; stdout: string; stderr: string;
  exitCode: number | null; timedOut: boolean; expected: string; received: string;
};

type Row = {
  id: string;
  problem: string;
  language: string;
  code: string;
  results: TestResult[] | null;
  status: string;
  score: string;
  passed: boolean;
  timestamp: string;
};

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
}

export default function ManagerUserDetailClient({
  user,
  initialIsAdmin,
  initialIsManager,
  currentUserId,
  initialSubmissions,
}: ManagerUserDetailClientProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [isManager, setIsManager] = useState(initialIsManager);
  const [promoting, setPromoting] = useState(false);
  const [promotingManager, setPromotingManager] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Row | null>(null);
  const isSelf = currentUserId === user.id;

  const totalSubmissions = initialSubmissions.length;
  const acceptedSubmissions = initialSubmissions.filter(s => s.passed).length;
  const acceptanceRate = totalSubmissions > 0
    ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
    : 0;

  const displayName = user.username || user.email || 'User';
  const avatarLetter = displayName[0].toUpperCase();

  const handlePromote = async (promote: boolean) => {
    setPromoting(true);
    try {
      const res = await fetch(`/api/manager/users/${user.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setIsAdmin(data.isAdmin);
      toast.success(promote ? 'User promoted to Admin' : 'User demoted to User');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setIsManager(data.isManager);
      toast.success(promote ? 'User promoted to Manager' : 'User demoted from Manager');
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
      render: (r) => <Badge variant={r.passed ? 'success' : 'error'}>{r.passed ? 'Accepted' : 'Failed'}</Badge>,
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
          onClick={() => setSelectedSubmission(r)}
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
              <span className="text-xs text-text-muted font-mono">{totalSubmissions} total</span>
            </div>
            <div className="glass-panel overflow-hidden">
              <div className="bg-surface-2 px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Submissions</h2>
              </div>
              {totalSubmissions > 0 ? (
                <DataTable<Row> columns={columns} rows={initialSubmissions} rowKey={(r) => r.id} pageSize={20} />
              ) : (
                <p className="text-sm text-text-muted py-8 text-center">No submissions found for this user.</p>
              )}
            </div>
          </div>

        </div>

        {/* Submission detail modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSubmission(null)}>
            <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Submission Details</h2>
                  <p className="text-xs text-text-muted">by {displayName} • {selectedSubmission.problem} • {formatDate(selectedSubmission.timestamp)}</p>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="text-text-muted hover:text-foreground text-lg">×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-2 p-3 rounded-md border border-border">
                    <div className="text-text-muted text-xs uppercase tracking-wider">Status</div>
                    <div className={`text-sm font-semibold mt-1 ${selectedSubmission.passed ? 'text-success' : 'text-error'}`}>
                      {selectedSubmission.passed ? 'Accepted' : 'Failed'}
                    </div>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-md border border-border">
                    <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
                    <div className="text-sm font-semibold text-foreground mt-1 font-mono">{selectedSubmission.score}</div>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-md border border-border">
                    <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
                    <div className="text-sm font-semibold text-foreground mt-1 uppercase">{selectedSubmission.language}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
                  <div className="rounded-md overflow-hidden border border-border text-sm">
                    <SubmissionCodeBlock language={selectedSubmission.language} code={selectedSubmission.code} />
                  </div>
                </div>

                {selectedSubmission.results && selectedSubmission.results.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
                    <div className="space-y-1.5">
                      {selectedSubmission.results.map((r, i) => (
                        <div key={i} className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium text-sm ${r.passed ? 'text-success' : 'text-error'}`}>
                              Case #{i + 1}: {r.passed ? 'Passed' : 'Failed'}
                            </span>
                            <span className="text-xs text-text-muted font-mono">
                              Exit: {r.exitCode ?? 'N/A'} {r.timedOut ? '(Timed Out)' : ''}
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

              <div className="px-5 py-3 border-t border-border flex justify-end">
                <button onClick={() => setSelectedSubmission(null)} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Close</button>
              </div>
            </div>
          </div>
        )}

      </ManagerGuard>
    </AuthGuard>
  );
}
