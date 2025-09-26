"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Logo } from '@/components/Logo';

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
}

// Lazy load Markdown components (avoid SSR issues if any)
const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

export default function ManageProblemsPage() {
  const { session, user, signOut } = useAuth();
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  const openEdit = async (p: ProblemRow) => {
    setFetchingEditContent(true);
    try {
      // Fetch full problem content via admin endpoint (ensures access to inactive/contest problems)
      const res = await fetch(`/api/admin/problems/${p.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load problem');
      setEditing({ id: p.id, name: data.problem.name, content: data.problem.content || '', is_active: !!(data.problem.is_active ?? p.is_active) });
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
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
          {/* Top Navigation Bar (match create/dashboard pages) */}
          <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
                Admin: {user?.user_metadata?.username || user?.email}
              </span>
              <button
                onClick={async () => { await signOut(); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Sign Out
              </button>
            </div>
          </nav>
          <div className="flex">
            <AdminSidebar />
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
                          <td className="py-2 px-3 text-gray-400">{p.contest_name || p.contest || '-'}</td>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="w-full max-w-5xl bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl">
                      <div>
                        <h2 className="text-xl font-bold tracking-wide">Edit Problem</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Update problem metadata & statement</p>
                      </div>
                      <button onClick={closeEdit} className="text-gray-400 hover:text-white transition" aria-label="Close edit modal">✕</button>
                    </div>
                    {/* Modal Body (scrollable) */}
                    <div className="overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">
                      {fetchingEditContent ? (
                        <div className="animate-pulse text-gray-400">Loading content...</div>
                      ) : (
                        <>
                          {/* Name & Status Row */}
                          <div className="grid md:grid-cols-3 gap-6 items-start">
                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-sm font-medium">Name</label>
                              <input
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none focus:ring focus:ring-green-600/40"
                                value={editing.name}
                                placeholder="Enter problem title"
                                onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)}
                              />
                            </div>
                            <div className="flex md:flex-col gap-4 md:gap-2 pt-6 md:pt-0">
                              <label className="inline-flex items-center gap-2 text-sm select-none">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={editing.is_active}
                                  onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)}
                                />
                                Active
                              </label>
                              <button
                                onClick={saveEdit}
                                disabled={!editing.name.trim()}
                                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 text-sm font-medium transition shadow-md shadow-green-600/20"
                              >
                                Save Now
                              </button>
                            </div>
                          </div>

                          {/* Editor & Preview */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium">Content (Markdown)</label>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                              <div className="flex flex-col gap-2 min-h-[500px]">
                                <MarkdownEditor
                                  value={editing.content}
                                  onChange={(val: string) => setEditing(s => s ? { ...s, content: val } : s)}
                                  placeholder="Write problem statement in Markdown..."
                                  height={500}
                                />
                              </div>
                              <div className="border border-white/10 rounded-lg p-4 bg-black/40 overflow-auto max-h-[600px] relative">
                                <div className="text-xs uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Preview
                                </div>
                                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                                  <MarkdownRenderer content={editing.content || '*Nothing yet...*'} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-gray-900/80 rounded-b-xl">
                      <button onClick={closeEdit} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm font-medium">Close</button>
                      <button
                        onClick={saveEdit}
                        disabled={!editing.name.trim()}
                        className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 font-semibold text-sm shadow-lg shadow-green-600/20 transition"
                      >
                        Save Changes
                      </button>
                    </div>
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
