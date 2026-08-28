'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SubmissionDetailModal } from '@/components/SubmissionDetailModal';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useViewCode } from '@/hooks/useViewCode';
import { displayLanguage } from '@/lib/languages';
import type { AdminSubmissionRow } from './page';
import { formatSubmittedAt } from '@/utils/formatDate';

type Row = AdminSubmissionRow;

export default function AdminDashboardClient({
  initialSubmissions,
  currentPage,
  totalPages,
  totalCount,
}: {
  initialSubmissions: Row[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const { session } = useAuth();
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

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

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return '—';
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

  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'user',
      header: 'User',
      className: 'w-[18%]',
      sortable: true,
      sortAccessor: (r) => r.user.toLowerCase(),
      render: (r) => <span className="text-foreground font-medium">{r.user}</span>,
    },
    {
      key: 'problem',
      header: 'Problem',
      className: 'w-[22%]',
      sortable: true,
      sortAccessor: (r) => r.problem.toLowerCase(),
      render: (r) => <span className="text-text-muted">{r.problem}</span>,
    },
    {
      key: 'language',
      header: 'Language',
      className: 'w-[10%]',
      sortable: true,
      sortAccessor: (r) => r.language,
      render: (r) => (
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
          {displayLanguage(r.language)}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      className: 'w-[8%]',
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
      className: 'w-[12%]',
      sortable: true,
      sortAccessor: (r) => (r.passed ? 1 : 0),
      render: (r) => {
        if (r.isCompileError) return <Badge variant="neutral">CE</Badge>;
        return <Badge variant={r.passed ? 'success' : 'error'}>{r.passed ? 'Accepted' : 'Failed'}</Badge>;
      },
    },
    {
      key: 'when',
      header: 'Submitted',
      className: 'w-[15%]',
      sortable: true,
      sortAccessor: (r) => (r.timestamp ? new Date(r.timestamp).getTime() : 0),
      render: (r) => (
        <span className="text-text-muted text-sm font-mono" title={formatSubmittedAt(r.timestamp)}>
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
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Manage contests and problems for the competitive programming platform</p>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Submissions</h2>
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
            <p className="text-sm text-text-muted py-8 text-center">No submissions found.</p>
          )}
        </div>
      </div>

      <SubmissionDetailModal
        submission={selected}
        loading={viewCodeLoading}
        subtitle={selectedRow ? `by ${selectedRow.user} • ${selectedRow.problem} • ${formatSubmittedAt(selectedRow.timestamp)}` : 'Loading…'}
        onClose={handleCloseViewCode}
      />
    </AuthGuard>
  );
}
