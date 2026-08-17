'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  submissionsCount?: number;
  isAdmin: boolean;
  isManager: boolean;
}

export default function ManagerUserManagementClient({
  rows,
  currentPage,
  totalPages,
  currentSearch,
  currentFilter,
}: {
  rows: ManagedUser[];
  currentPage: number;
  totalPages: number;
  currentSearch: string;
  currentFilter: 'all' | 'active' | 'disabled';
}) {
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

  const filterOptions = ['all', 'active', 'disabled'] as const;

  type Row = ManagedUser;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'username', header: 'Username', className: 'w-[22%]', sortable: true, sortAccessor: (r) => (r.username || '').toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.username || '-'}</span> },
    { key: 'email', header: 'Email', className: 'w-[28%]', sortable: true, sortAccessor: (r) => (r.email || '').toLowerCase(), render: (r) => <span className="text-text-muted">{r.email || '-'}</span> },
    { key: 'status', header: 'Status', className: 'w-[12%]', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Active' : 'Disabled'}</Badge> },
    { key: 'role', header: 'Role', className: 'w-[12%]', sortable: true, sortAccessor: (r) => (r.isManager ? 2 : r.isAdmin ? 1 : 0), render: (r) => <Badge variant={r.isManager ? 'accent' : r.isAdmin ? 'info' : 'neutral'}>{r.isManager ? 'Manager' : r.isAdmin ? 'Admin' : 'User'}</Badge> },
    { key: 'submissions_count', header: 'Submissions', className: 'w-[10%]', sortable: true, sortAccessor: (r) => r.submissionsCount || 0, render: (r) => <span className="text-text-muted font-mono">{r.submissionsCount || 0}</span> },
    {
      key: 'actions', header: '', className: 'w-[16%] text-right', render: (r) => (
        <Link href={`/manager/usermanagement/${r.id}`}>
          <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors">
            View
          </button>
        </Link>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-text-muted mt-1">View users and analyze their submissions.</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={searchValue} onChange={e => onSearchChange(e.target.value)}
              placeholder="Search by username or email..."
              className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
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
              <h2 className="text-sm font-semibold text-foreground">All Users</h2>
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
      </ManagerGuard>
    </AuthGuard>
  );
}