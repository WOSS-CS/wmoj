"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';

interface ContestRow {
  id: string; name: string; length: number | null;
  is_active: boolean | null; created_at: string; updated_at: string;
}

interface EditState {
  id: string; name: string; description: string; length: number | null; is_active: boolean;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

const inputClass = "w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function ManageContestsPage() {
  const { session } = useAuth();
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const token = session?.access_token;

  const fetchContests = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/contests/list', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setContests(data.contests || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error fetching contests'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) { setError(null); fetchContests(); } }, [token, fetchContests]);

  const filteredContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter(c => {
      if (filter === 'active' && !c.is_active) return false;
      if (filter === 'inactive' && c.is_active) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [contests, filter, search]);

  const openEdit = async (c: ContestRow) => {
    setFetchingEditContent(true);
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contest');
      setEditing({ id: c.id, name: data.contest.name, description: data.contest.description || '', length: data.contest.length || null, is_active: !!c.is_active });
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to open editor'); }
    finally { setFetchingEditContent(false); }
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/admin/contests/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: editing.name, description: editing.description, length: editing.length, is_active: editing.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActionMessage('Contest updated');
      setContests(prev => prev.map(c => c.id === editing.id ? { ...c, name: editing.name, is_active: editing.is_active, length: editing.length ?? c.length, updated_at: new Date().toISOString() } : c));
      closeEdit();
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to save'); }
  };

  const toggleActive = async (c: ContestRow) => {
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      setContests(prev => prev.map(row => row.id === c.id ? { ...row, is_active: !c.is_active } : row));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to toggle'); }
  };

  const deleteContest = async (c: ContestRow) => {
    if (!confirm('Delete this contest? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setContests(prev => prev.filter(row => row.id !== c.id));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  const filterOptions = ['all', 'active', 'inactive'] as const;

  type Row = ContestRow;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'name', header: 'Name', className: 'w-[25%]', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.name}</span> },
    { key: 'length', header: 'Length', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.length ?? 0, render: (r) => <span className="text-text-muted font-mono">{r.length ? `${r.length} min` : '-'}</span> },
    { key: 'status', header: 'Status', className: 'w-[12%]', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'updated', header: 'Updated', className: 'w-[15%]', sortable: true, sortAccessor: (r) => new Date(r.updated_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions', header: 'Actions', className: 'w-[33%]', render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</button>
          <button onClick={() => toggleActive(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => deleteContest(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
        </div>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manage Contests</h1>
            <p className="text-sm text-text-muted mt-1">Edit, activate/deactivate, or delete contests.</p>
          </div>

          {actionMessage && (
            <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}
          {error && <div className="text-error text-sm">{error}</div>}

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            <div className="flex items-center gap-1.5">
              {filterOptions.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <LoadingState isLoading={loading} skeleton={<SkeletonText lines={5} />}>
            {filteredContests.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No contests match your filters.</p>
            ) : (
              <DataTable<Row> columns={columns} rows={filteredContests} rowKey={(r) => r.id} />
            )}
          </LoadingState>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Edit Contest</h2>
                    <p className="text-xs text-text-muted">Modify contest settings & description</p>
                  </div>
                  <button onClick={closeEdit} className="text-text-muted hover:text-foreground text-lg">✕</button>
                </div>
                <div className="overflow-y-auto px-5 py-4 space-y-4">
                  {fetchingEditContent ? (
                    <SkeletonText lines={3} />
                  ) : (
                    <>
                      <div className="grid md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">Name</label>
                          <input className={inputClass} value={editing.name} placeholder="Contest title" onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)} />
                        </div>
                        <div className="space-y-2 pt-5 md:pt-0">
                          <label className="inline-flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface-2" checked={editing.is_active} onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)} />
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Length (minutes)</label>
                        <input type="number" className={`${inputClass} max-w-xs`} value={editing.length ?? ''} onChange={e => setEditing(s => s ? { ...s, length: e.target.value ? Number(e.target.value) : null } : s)} />
                        <p className="text-xs text-text-muted">Leave blank for unspecified length.</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Description (Markdown)</label>
                        <MarkdownEditor value={editing.description} onChange={(val: string) => setEditing(s => s ? { ...s, description: val } : s)} placeholder="Write contest description..." height={400} />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
                  <button onClick={closeEdit} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Cancel</button>
                  <button onClick={saveEdit} disabled={!editing?.name.trim()} className="px-4 py-1.5 rounded-md bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-40 text-sm font-medium">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
