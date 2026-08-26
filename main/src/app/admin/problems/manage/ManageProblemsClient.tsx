"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

interface ProblemRow {
  id: string; name: string; contest_names: string[];
  is_active: boolean | null; created_at: string; updated_at: string; points: number;
}

export default function ManageProblemsClient({
  rows,
  currentPage,
  totalPages,
  currentSearch,
  currentFilter,
}: {
  rows: ProblemRow[];
  currentPage: number;
  totalPages: number;
  currentSearch: string;
  currentFilter: 'all' | 'active' | 'inactive';
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const token = session?.access_token;

  const currentParams: Record<string, string | undefined> = {
    search: currentSearch || undefined,
    filter: currentFilter !== 'all' ? currentFilter : undefined,
  };

  const { displayPage, isLoading, handlePageChange, handleFilterChange, startTransition, buildHref } =
    usePaginatedNavigation({ currentPage, totalPages, currentParams });

  const { value: searchValue, onChange: onSearchChange } = useDebouncedSearch({
    param: 'search',
    initialValue: currentSearch,
    preserveParams: { filter: currentFilter !== 'all' ? currentFilter : undefined },
    startTransition,
  });

  const deleteProblem = async (p: ProblemRow) => {
    if (!confirm('Delete this problem? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      startTransition(() => router.refresh());
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  const filterOptions = ['all', 'active', 'inactive'] as const;

  type Row = ProblemRow;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'name', header: 'Name', className: 'w-3/12', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.name}</span> },
    { key: 'contest', header: 'Contests', className: 'w-2/12', sortable: true, sortAccessor: (r) => (r.contest_names[0] || '').toLowerCase(), render: (r) => <span className="text-text-muted">{r.contest_names.length > 0 ? r.contest_names.join(', ') : '-'}</span> },
    { key: 'status', header: 'Status', className: 'w-1/12', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'updated', header: 'Updated', className: 'w-2/12', sortable: true, sortAccessor: (r) => new Date(r.updated_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions', header: 'Actions', className: 'w-4/12', render: (r) => (
        <div className="flex gap-1.5">
          <Link href={`/problems/${r.id}`} target="_blank" rel="noopener" className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-foreground hover:bg-surface-3">View Problem</Link>
          <Link href={`/admin/problems/${r.id}/submissions`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-foreground hover:bg-surface-3">Submissions</Link>
          <Link href={`/admin/problems/${r.id}/edit`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</Link>
          <button
            onClick={() => deleteProblem(r)}
            disabled={!!r.is_active}
            title={r.is_active ? 'Live problems can only be deleted by a Manager.' : undefined}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${r.is_active ? 'bg-surface-2 text-text-muted opacity-50 cursor-not-allowed' : 'bg-error/10 text-error hover:bg-error/20'}`}
          >Delete</button>
        </div>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manage Problems</h1>
            <p className="text-sm text-text-muted mt-1">Edit or delete problems. Activation is managed by Managers.</p>
          </div>

          {actionMessage && (
            <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input value={searchValue} onChange={e => onSearchChange(e.target.value)} placeholder="Search by name..." className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            <div className="flex items-center gap-1.5">
              {filterOptions.map(f => (
                <button key={f} onClick={() => handleFilterChange({ filter: f !== 'all' ? f : undefined })} className={`px-3 py-1.5 rounded-md text-sm border capitalize ${currentFilter === f ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">All Problems</h2>
            </div>
            <div className="px-4 py-2 border-b border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildHref}
                displayPage={displayPage}
                loading={isLoading}
                onPageChange={handlePageChange}
              />
            </div>
            <DataTable<Row> columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} skeletonRowCount={20} />
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}