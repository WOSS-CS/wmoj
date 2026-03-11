'use client';

import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function UserManagementClient({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialUsers.filter(u => {
      if (filter === 'active' && !u.is_active) return false;
      if (filter === 'disabled' && u.is_active) return false;
      if (!q) return true;
      return (u.username?.toLowerCase() || '').includes(q) || (u.email?.toLowerCase() || '').includes(q);
    });
  }, [initialUsers, filter, search]);

  const filterOptions = ['all', 'active', 'disabled'] as const;

  type Row = ManagedUser;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'username', header: 'Username', className: 'w-[25%]', sortable: true, sortAccessor: (r) => (r.username || '').toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.username || '-'}</span> },
    { key: 'email', header: 'Email', className: 'w-[35%]', sortable: true, sortAccessor: (r) => (r.email || '').toLowerCase(), render: (r) => <span className="text-text-muted">{r.email || '-'}</span> },
    { key: 'status', header: 'Status', className: 'w-[15%]', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Active' : 'Disabled'}</Badge> },
    {
      key: 'submissions', header: 'Submissions', className: 'w-[25%]', render: (r) => (
        <Link href={`/admin/usermanagement/submissions/${r.id}`}>
          <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors">
            Submissions
          </button>
        </Link>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-text-muted mt-1">View users and analyze their submissions.</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <div className="flex items-center gap-1.5">
              {filterOptions.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No users match your filters.</p>
          ) : (
            <DataTable<Row> columns={columns} rows={filteredUsers} rowKey={(r) => r.id} />
          )}
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
