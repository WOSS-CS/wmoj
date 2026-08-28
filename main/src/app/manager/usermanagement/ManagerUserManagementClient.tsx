'use client';

import { AuthGuard } from '@/components/AuthGuard';
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
  created_at: string | null;
  updated_at: string | null;
  submissionsCount?: number;
  isAdmin: boolean;
  isManager: boolean;
}

export default function ManagerUserManagementClient({
  rows,
  currentPage,
  totalPages,
  currentSearch,
}: {
  rows: ManagedUser[];
  currentPage: number;
  totalPages: number;
  currentSearch: string;
}) {
  const currentParams: Record<string, string | undefined> = {
    search: currentSearch || undefined,
  };

  const { displayPage, isLoading, handlePageChange, startTransition, buildHref } =
    usePaginatedNavigation({ currentPage, totalPages, currentParams });

  const { value: searchValue, onChange: onSearchChange } = useDebouncedSearch({
    param: 'search',
    initialValue: currentSearch,
    startTransition,
  });

  type Row = ManagedUser;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'username', header: 'Username', className: 'w-[26%]', sortable: true, sortAccessor: (r) => (r.username || '').toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.username || '-'}</span> },
    { key: 'email', header: 'Email', className: 'w-[34%]', sortable: true, sortAccessor: (r) => (r.email || '').toLowerCase(), render: (r) => <span className="text-text-muted">{r.email || '-'}</span> },
    { key: 'role', header: 'Role', className: 'w-[12%]', sortable: true, sortAccessor: (r) => (r.isManager ? 2 : r.isAdmin ? 1 : 0), render: (r) => <Badge variant={r.isManager ? 'accent' : r.isAdmin ? 'info' : 'neutral'}>{r.isManager ? 'Manager' : r.isAdmin ? 'Admin' : 'User'}</Badge> },
    { key: 'submissions_count', header: 'Submissions', className: 'w-[12%]', sortable: true, sortAccessor: (r) => r.submissionsCount || 0, render: (r) => <span className="text-text-muted font-mono">{r.submissionsCount || 0}</span> },
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
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-text-muted mt-1">View users and analyze their submissions.</p>
        </div>

        <input
          value={searchValue} onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by username or email..."
          className="w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

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
    </AuthGuard>
  );
}