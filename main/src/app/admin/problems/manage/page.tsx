"use client";

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';

interface ProblemRow {
  id: string;
  name: string;
  contest: string | null;
  contest_name?: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface EditState {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  time_limit: number;
  memory_limit: number;
}

// Lazy load Markdown components (avoid SSR issues if any)
const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

export default function ManageProblemsPage() {
  const { session, user, signOut } = useAuth();
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const token = session?.access_token;

  const fetchProblems = useCallback(async () => {
    if (!token) return; // wait for token to avoid unauthorized flicker
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/problems/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setProblems(data.problems || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error fetching problems');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setError(null);
      fetchProblems();
    }
  }, [token, fetchProblems]);

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter(p => {
      if (filter === 'active' && !p.is_active) return false;
      if (filter === 'inactive' && p.is_active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.contest_name || '').toLowerCase().includes(q)
      );
    });
  }, [problems, filter, search]);

  const openEdit = async (p: ProblemRow) => {
    setFetchingEditContent(true);
    try {
      // Fetch full problem content via admin endpoint (ensures access to inactive/contest problems)
      const res = await fetch(`/api/admin/problems/${p.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load problem');
      setEditing({
        id: p.id,
        name: data.problem.name,
        content: data.problem.content || '',
        is_active: !!(data.problem.is_active ?? p.is_active),
        time_limit: data.problem.time_limit || 5000,
        memory_limit: data.problem.memory_limit || 256
      });
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to open editor');
    } finally {
      setFetchingEditContent(false);
    }
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/admin/problems/${editing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editing.name,
          content: editing.content,
          is_active: editing.is_active,
          time_limit: editing.time_limit,
          memory_limit: editing.memory_limit
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActionMessage('Problem updated');
      // Optimistic update
      setProblems(prev => prev.map(p => p.id === editing.id ? { ...p, name: editing.name, is_active: editing.is_active, updated_at: new Date().toISOString() } : p));
      closeEdit();
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to save edit');
    }
  };

  const toggleActive = async (p: ProblemRow) => {
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      setProblems(prev => prev.map(row => row.id === p.id ? { ...row, is_active: !p.is_active } : row));
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to toggle');
    }
  };

  const deleteProblem = async (p: ProblemRow) => {
    if (!confirm('Delete this problem? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/problems/${p.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setProblems(prev => prev.filter(row => row.id !== p.id));
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 relative">
              Manage Problems
              <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" />
            </h1>
            <p className="text-text-muted text-lg">Edit, activate/deactivate, or delete problems.</p>
          </div>
          {actionMessage && (
            <div className="mb-4 p-3 rounded bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground">×</button>
            </div>
          )}
          {error && <div className="text-red-400 mb-4">{error}</div>}

          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or contest..."
                className="flex-1 px-4 py-2 rounded-lg bg-surface-2 border border-border text-foreground placeholder-text-muted/50 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex items-center gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg border ${filter === 'all' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>All</button>
                <button onClick={() => setFilter('active')} className={`px-3 py-2 rounded-lg border ${filter === 'active' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>Active</button>
                <button onClick={() => setFilter('inactive')} className={`px-3 py-2 rounded-lg border ${filter === 'inactive' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>Inactive</button>
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse text-text-muted">Loading problems...</div>
            ) : filteredProblems.length === 0 ? (
              <div className="text-center py-12 text-text-muted">No problems match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  type Row = ProblemRow;
                  const columns: Array<DataTableColumn<Row>> = [
                    {
                      key: 'name',
                      header: 'Name',
                      className: 'w-3/12',
                      sortable: true,
                      sortAccessor: (r) => r.name.toLowerCase(),
                      render: (r) => <span className="text-foreground font-medium" title={r.name}>{r.name}</span>,
                    },
                    {
                      key: 'contest',
                      header: 'Contest',
                      className: 'w-2/12',
                      sortable: true,
                      sortAccessor: (r) => (r.contest_name || r.contest || '').toLowerCase(),
                      render: (r) => <span className="text-text-muted">{r.contest_name || r.contest || '-'}</span>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      className: 'w-2/12',
                      sortable: true,
                      sortAccessor: (r) => (r.is_active ? 1 : 0),
                      render: (r) => (
                        <span className={`px-2 py-1 rounded text-xs border ${r.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      ),
                    },
                    {
                      key: 'updated',
                      header: 'Updated',
                      className: 'w-2/12',
                      sortable: true,
                      sortAccessor: (r) => new Date(r.updated_at).getTime(),
                      render: (r) => <span className="text-text-muted" title={r.updated_at}>{new Date(r.updated_at).toLocaleDateString()}</span>,
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'w-2/12',
                      render: (r) => (
                        <div className="flex gap-2">
                          <Link href={`/admin/problems/${r.id}/submissions`} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-purple-600 hover:bg-purple-700 text-white text-sm">Submissions</Link>
                          <button onClick={() => openEdit(r)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-blue-600 hover:bg-blue-700 text-white text-sm">Edit</button>
                          <button onClick={() => toggleActive(r)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-yellow-600 hover:bg-yellow-700 text-white text-sm">{r.is_active ? 'Deactivate' : 'Activate'}</button>
                          <button onClick={() => deleteProblem(r)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-red-600 hover:bg-red-700 text-white text-sm">Delete</button>
                        </div>
                      ),
                    },
                  ];
                  return (
                    <DataTable<Row>
                      columns={columns}
                      rows={filteredProblems}
                      rowKey={(r) => r.id}
                      headerVariant="blue"
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-5xl bg-surface-1 border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2 rounded-t-xl">
                  <div>
                    <h2 className="text-xl font-bold tracking-wide text-foreground">Edit Problem</h2>
                    <p className="text-xs text-text-muted mt-0.5">Update problem metadata & statement</p>
                  </div>
                  <button onClick={closeEdit} className="text-text-muted hover:text-foreground transition" aria-label="Close edit modal">✕</button>
                </div>
                {/* Modal Body (scrollable) */}
                <div className="overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">
                  {fetchingEditContent ? (
                    <div className="animate-pulse text-text-muted">Loading content...</div>
                  ) : (
                    <>
                      {/* Name & Status Row */}
                      <div className="grid md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2 space-y-2">
                          <label className="block text-sm font-medium text-foreground">Name</label>
                          <input
                            className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border text-foreground focus:outline-none focus:ring focus:ring-blue-500/20"
                            value={editing.name}
                            placeholder="Enter problem title"
                            onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)}
                          />
                        </div>
                        <div className="flex md:flex-col gap-4 md:gap-2 pt-6 md:pt-0">
                          <label className="inline-flex items-center gap-2 text-sm select-none text-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border bg-surface-2 text-blue-500 focus:ring-blue-500/20"
                              checked={editing.is_active}
                              onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)}
                            />
                            Active
                          </label>
                          <button
                            onClick={saveEdit}
                            disabled={!editing.name.trim()}
                            className="px-4 py-2 rounded-md bg-brand-primary text-black hover:bg-brand-secondary disabled:opacity-40 text-sm font-medium transition shadow-md shadow-brand-primary/20"
                          >
                            Save Now
                          </button>
                        </div>
                      </div>

                      {/* Time Limit and Memory Limit Row */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Time Limit (ms)</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border text-foreground focus:outline-none focus:ring focus:ring-blue-500/20"
                            value={editing.time_limit}
                            placeholder="e.g., 5000"
                            onChange={e => setEditing(s => s ? { ...s, time_limit: parseInt(e.target.value, 10) || 5000 } : s)}
                          />
                          <p className="text-xs text-text-muted">Maximum execution time in milliseconds</p>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Memory Limit (MB)</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border text-foreground focus:outline-none focus:ring focus:ring-blue-500/20"
                            value={editing.memory_limit}
                            placeholder="e.g., 256"
                            onChange={e => setEditing(s => s ? { ...s, memory_limit: parseInt(e.target.value, 10) || 256 } : s)}
                          />
                          <p className="text-xs text-text-muted">Maximum memory usage in megabytes</p>
                        </div>
                      </div>

                      {/* Editor */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Content (Markdown)</label>
                        <div className="flex flex-col gap-2 min-h-[500px]">
                          <MarkdownEditor
                            value={editing.content}
                            onChange={(val: string) => setEditing(s => s ? { ...s, content: val } : s)}
                            placeholder="Write problem statement in Markdown..."
                            height={500}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-2 rounded-b-xl">
                  <button onClick={closeEdit} className="px-4 py-2 rounded-md bg-surface-3 hover:bg-surface-4 transition text-sm font-medium text-foreground">Close</button>
                  <button
                    onClick={saveEdit}
                    disabled={!editing.name.trim()}
                    className="px-5 py-2 rounded-md bg-brand-primary text-black hover:bg-brand-secondary disabled:opacity-40 font-semibold text-sm shadow-lg shadow-brand-primary/20 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
