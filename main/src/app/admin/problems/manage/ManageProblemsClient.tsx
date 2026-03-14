"use client";

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';

interface ProblemRow {
  id: string; name: string; contest: string | null; contest_name?: string | null;
  is_active: boolean | null; created_at: string; updated_at: string; difficulty?: string;
}

export default function ManageProblemsClient({ 
  initialProblems, 
  initialContests 
}: { 
  initialProblems: ProblemRow[], 
  initialContests: { id: string, name: string }[] 
}) {
  const { session } = useAuth();
  const [problems, setProblems] = useState<ProblemRow[]>(initialProblems);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [availableContests] = useState<{ id: string, name: string }[]>(initialContests);
  const token = session?.access_token;

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter(p => {
      if (filter === 'active' && !p.is_active) return false;
      if (filter === 'inactive' && p.is_active) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.contest_name || '').toLowerCase().includes(q);
    });
  }, [problems, filter, search]);

  const toggleActive = async (p: ProblemRow) => {
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ is_active: !p.is_active }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      setProblems(prev => prev.map(row => row.id === p.id ? { ...row, is_active: !p.is_active } : row));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to toggle'); }
  };

  const deleteProblem = async (p: ProblemRow) => {
    if (!confirm('Delete this problem? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setProblems(prev => prev.filter(row => row.id !== p.id));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  const filterOptions = ['all', 'active', 'inactive'] as const;

  type Row = ProblemRow;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'name', header: 'Name', className: 'w-3/12', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.name}</span> },
    { key: 'contest', header: 'Contest', className: 'w-2/12', sortable: true, sortAccessor: (r) => (r.contest_name || r.contest || '').toLowerCase(), render: (r) => <span className="text-text-muted">{r.contest_name || r.contest || '-'}</span> },
    { key: 'status', header: 'Status', className: 'w-1/12', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'updated', header: 'Updated', className: 'w-2/12', sortable: true, sortAccessor: (r) => new Date(r.updated_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions', header: 'Actions', className: 'w-4/12', render: (r) => (
        <div className="flex gap-1.5">
          <Link href={`/admin/problems/${r.id}/submissions`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-foreground hover:bg-surface-3">Submissions</Link>
          <Link href={`/admin/problems/${r.id}/edit`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</Link>
          <button onClick={() => toggleActive(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => deleteProblem(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
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
            <p className="text-sm text-text-muted mt-1">Edit, activate/deactivate, or delete problems.</p>
          </div>

          {actionMessage && (
            <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}
          {error && <div className="text-error text-sm">{error}</div>}

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or contest..." className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            <div className="flex items-center gap-1.5">
              {filterOptions.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredProblems.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No problems match your filters.</p>
          ) : (
            <DataTable<Row> columns={columns} rows={filteredProblems} rowKey={(r) => r.id} />
          )}
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
