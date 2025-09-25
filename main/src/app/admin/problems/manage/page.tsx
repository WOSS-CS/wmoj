"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ProblemRow {
  id: string;
  name: string;
  contest: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface EditState {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
}

// Lazy load Markdown components (avoid SSR issues if any)
const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

export default function ManageProblemsPage() {
  const { session } = useAuth();
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const token = session?.access_token;

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/problems/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const openEdit = async (p: ProblemRow) => {
    setFetchingEditContent(true);
    try {
      // Fetch full problem content via existing public problem endpoint
      const res = await fetch(`/api/problems/${p.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load problem');
      setEditing({ id: p.id, name: data.problem.name, content: data.problem.content || '', is_active: !!p.is_active });
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
        body: JSON.stringify({ name: editing.name, content: editing.content, is_active: editing.is_active }),
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
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
          <div className="flex">
            <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 min-h-screen p-6">
              <h2 className="text-xl font-bold mb-6">Admin</h2>
              <nav className="space-y-2">
                <Link href="/admin/dashboard" className="block px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition">Dashboard</Link>
                <Link href="/admin/contests/create" className="block px-4 py-2 rounded hover:bg-white/10 transition">Create Contest</Link>
                <Link href="/admin/problems/create" className="block px-4 py-2 rounded hover:bg-white/10 transition">Create Problem</Link>
                <Link href="/admin/problems/manage" className="block px-4 py-2 rounded bg-green-600/20 border border-green-500 text-green-300">Manage Problems</Link>
                <Link href="/admin/contests/manage" className="block px-4 py-2 rounded hover:bg-white/10 transition">Manage Contests</Link>
              </nav>
            </aside>
            <main className="flex-1 p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Manage Problems</h1>
                <button onClick={fetchProblems} className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition">Refresh</button>
              </div>
              {actionMessage && (
                <div className="mb-4 p-3 rounded bg-white/10 border border-white/20 text-sm flex justify-between items-center">
                  <span>{actionMessage}</span>
                  <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">×</button>
                </div>
              )}
              {error && <div className="text-red-400 mb-4">{error}</div>}
              {loading ? (
                <div className="animate-pulse text-gray-400">Loading problems...</div>
              ) : (
                <div className="overflow-x-auto rounded border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/10 text-gray-300">
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Contest</th>
                        <th className="py-2 px-3">Active</th>
                        <th className="py-2 px-3">Updated</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map(p => (
                        <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="py-2 px-3 font-medium text-white max-w-xs truncate" title={p.name}>{p.name}</td>
                          <td className="py-2 px-3 text-gray-400">{p.contest || '-'}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${p.is_active ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'bg-red-600/20 text-red-300 border border-red-500/30'}`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-400" title={p.updated_at}>{new Date(p.updated_at).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-right space-x-2">
                            <button onClick={() => openEdit(p)} className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500">Edit</button>
                            <button onClick={() => toggleActive(p)} className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500">{p.is_active ? 'Deactivate' : 'Activate'}</button>
                            <button onClick={() => deleteProblem(p)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {problems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">No problems found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Edit Modal */}
              {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-lg p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Edit Problem</h2>
                      <button onClick={closeEdit} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    {fetchingEditContent ? (
                      <div className="animate-pulse text-gray-400">Loading content...</div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Name</label>
                          <input
                            className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 focus:outline-none focus:ring focus:ring-green-600/40"
                            value={editing.name}
                            onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Content (Markdown)</label>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <MarkdownEditor
                                value={editing.content}
                                onChange={(val: string) => setEditing(s => s ? { ...s, content: val } : s)}
                                placeholder="Write problem statement in Markdown..."
                              />
                            </div>
                            <div className="border border-white/10 rounded-lg p-3 bg-black/30 overflow-auto max-h-80">
                              <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Preview</div>
                              <div className="prose prose-invert max-w-none">
                                <MarkdownRenderer content={editing.content || '*Nothing yet...*'} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="activeToggle"
                            type="checkbox"
                            checked={editing.is_active}
                            onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)}
                          />
                          <label htmlFor="activeToggle" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button onClick={closeEdit} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Cancel</button>
                          <button onClick={saveEdit} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50" disabled={!editing.name.trim()}>
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
