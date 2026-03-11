"use client";

import Link from 'next/link';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';

interface ProblemRow {
  id: string; name: string; contest: string | null; contest_name?: string | null;
  is_active: boolean | null; created_at: string; updated_at: string; difficulty?: string;
}

interface EditState {
  id: string; name: string; content: string; contest: string | null;
  is_active: boolean; time_limit: number; memory_limit: number; difficulty: string;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

const inputClass = "w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

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
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
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

  const openEdit = async (p: ProblemRow) => {
    setFetchingEditContent(true);
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load problem');
      setEditing({ id: p.id, name: data.problem.name, content: data.problem.content || '', contest: data.problem.contest || null, is_active: !!(data.problem.is_active ?? p.is_active), time_limit: data.problem.time_limit || 5000, memory_limit: data.problem.memory_limit || 256, difficulty: data.problem.difficulty || 'Easy' });
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to open editor'); }
    finally { setFetchingEditContent(false); }
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/admin/problems/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: editing.name, content: editing.content, contest: editing.contest, is_active: editing.is_active, time_limit: editing.time_limit, memory_limit: editing.memory_limit, difficulty: editing.difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActionMessage('Problem updated');
      const updatedContestInfo = availableContests.find(c => c.id === editing.contest);
      setProblems(prev => prev.map(p => p.id === editing.id ? { ...p, name: editing.name, contest: editing.contest, contest_name: updatedContestInfo ? updatedContestInfo.name : null, is_active: editing.is_active, updated_at: new Date().toISOString() } : p));
      closeEdit();
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to save'); }
  };

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
          <button onClick={() => openEdit(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</button>
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

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Edit Problem</h2>
                    <p className="text-xs text-text-muted">Update problem metadata & statement</p>
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
                          <input className={inputClass} value={editing.name} placeholder="Problem title" onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)} />
                        </div>
                        <div className="space-y-2 pt-5 md:pt-0">
                          <label className="inline-flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface-2" checked={editing.is_active} onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)} />
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-4">
                        <label className="block text-sm font-medium text-foreground">Contest</label>
                        <select className={inputClass} value={editing.contest || 'standalone'} onChange={e => setEditing(s => s ? { ...s, contest: e.target.value === 'standalone' ? null : e.target.value } : s)}>
                          <option value="standalone">Standalone (No Contest)</option>
                          {availableContests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Difficulty</label>
                        <select className={inputClass} value={editing.difficulty || 'Easy'} onChange={e => setEditing(s => s ? { ...s, difficulty: e.target.value } : s)}>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">Time Limit (ms)</label>
                          <input type="number" min="1" className={inputClass} value={editing.time_limit} onChange={e => setEditing(s => s ? { ...s, time_limit: parseInt(e.target.value, 10) || 5000 } : s)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">Memory Limit (MB)</label>
                          <input type="number" min="1" className={inputClass} value={editing.memory_limit} onChange={e => setEditing(s => s ? { ...s, memory_limit: parseInt(e.target.value, 10) || 256 } : s)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Content (Markdown)</label>
                        <MarkdownEditor value={editing.content} onChange={(val: string) => setEditing(s => s ? { ...s, content: val } : s)} placeholder="Write problem statement..." height={400} />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
                  <button onClick={closeEdit} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Cancel</button>
                  <button onClick={saveEdit} disabled={!editing.name.trim()} className="px-4 py-1.5 rounded-md bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-40 text-sm font-medium">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
