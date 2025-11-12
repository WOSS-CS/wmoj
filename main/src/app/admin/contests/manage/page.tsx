"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Logo } from '@/components/Logo';

interface ContestRow {
  id: string;
  name: string;
  length: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface EditState {
  id: string;
  name: string;
  description: string;
  length: number | null;
  is_active: boolean;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

export default function ManageContestsPage() {
  const { session, user, signOut } = useAuth();
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
    if (!token) return; // wait for token to avoid unauthorized flicker
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contests/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setContests(data.contests || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error fetching contests');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setError(null);
      fetchContests();
    }
  }, [token, fetchContests]);

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
      // Use admin endpoint to fetch contest details (handles inactive too)
      const res = await fetch(`/api/admin/contests/${c.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contest');
      setEditing({ id: c.id, name: data.contest.name, description: data.contest.description || '', length: data.contest.length || null, is_active: !!c.is_active });
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
      const res = await fetch(`/api/admin/contests/${editing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: editing.name, description: editing.description, length: editing.length, is_active: editing.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActionMessage('Contest updated');
      setContests(prev => prev.map(c => c.id === editing.id ? { ...c, name: editing.name, is_active: editing.is_active, length: editing.length ?? c.length, updated_at: new Date().toISOString() } : c));
      closeEdit();
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to save edit');
    }
  };

  const toggleActive = async (c: ContestRow) => {
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      setContests(prev => prev.map(row => row.id === c.id ? { ...row, is_active: !c.is_active } : row));
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to toggle');
    }
  };

  const deleteContest = async (c: ContestRow) => {
    if (!confirm('Delete this contest? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setContests(prev => prev.filter(row => row.id !== c.id));
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
          {/* Top Navigation Bar */}
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
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Manage Contests
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">Edit, activate/deactivate, or delete contests.</p>
              </div>
              {actionMessage && (
                <div className="mb-4 p-3 rounded bg-white/10 border border-white/20 text-sm flex justify-between items-center">
                  <span>{actionMessage}</span>
                  <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">×</button>
                </div>
              )}
              {error && <div className="text-red-400 mb-4">{error}</div>}

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="flex-1 px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg border ${filter==='all'?'text-green-400 border-green-400/40 bg-green-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>All</button>
                    <button onClick={() => setFilter('active')} className={`px-3 py-2 rounded-lg border ${filter==='active'?'text-green-400 border-green-400/40 bg-green-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>Active</button>
                    <button onClick={() => setFilter('inactive')} className={`px-3 py-2 rounded-lg border ${filter==='inactive'?'text-green-400 border-green-400/40 bg-green-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>Inactive</button>
                  </div>
                </div>

                {loading ? (
                  <div className="animate-pulse text-gray-400">Loading contests...</div>
                ) : filteredContests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No contests match your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="text-gray-300">
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Length (min)</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Updated</th>
                          <th className="px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContests.map(c => (
                          <tr key={c.id} className="border-t border-white/10 hover:bg-white/5">
                            <td className="px-4 py-3 text-white font-medium" title={c.name}>{c.name}</td>
                            <td className="px-4 py-3 text-gray-300">{c.length ?? '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${c.is_active ? 'bg-green-400/10 text-green-400 border border-green-400/30' : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'}`}>
                                {c.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400" title={c.updated_at}>{new Date(c.updated_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(c)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-blue-600 hover:bg-blue-700 text-white text-sm">Edit</button>
                                <button onClick={() => toggleActive(c)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-yellow-600 hover:bg-yellow-700 text-white text-sm">{c.is_active ? 'Deactivate' : 'Activate'}</button>
                                <button onClick={() => deleteContest(c)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-red-600 hover:bg-red-700 text-white text-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="w-full max-w-5xl bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl">
                      <div>
                        <h2 className="text-xl font-bold tracking-wide">Edit Contest</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Modify contest settings & description</p>
                      </div>
                      <button onClick={closeEdit} className="text-gray-400 hover:text-white transition" aria-label="Close edit modal">✕</button>
                    </div>
                    {/* Body */}
                    <div className="overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">
                      {fetchingEditContent ? (
                        <div className="animate-pulse text-gray-400">Loading content...</div>
                      ) : (
                        <>
                          <div className="grid md:grid-cols-3 gap-6 items-start">
                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-sm font-medium">Name</label>
                              <input
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none focus:ring focus:ring-green-600/40"
                                value={editing.name}
                                placeholder="Enter contest title"
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
                          <div className="grid md:grid-cols-3 gap-6 items-start">
                            <div className="space-y-2 md:col-span-1">
                              <label className="block text-sm font-medium">Length (minutes)</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none focus:ring focus:ring-green-600/40"
                                value={editing.length ?? ''}
                                onChange={e => setEditing(s => s ? { ...s, length: e.target.value ? Number(e.target.value) : null } : s)}
                              />
                              <p className="text-[11px] text-gray-500">Leave blank for unspecified length.</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium">Description (Markdown)</label>
                            <div className="flex flex-col gap-2 min-h-[420px]">
                              <MarkdownEditor
                                value={editing.description}
                                onChange={(val: string) => setEditing(s => s ? { ...s, description: val } : s)}
                                placeholder="Write contest description in Markdown..."
                                height={420}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-gray-900/80 rounded-b-xl">
                      <button onClick={closeEdit} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm font-medium">Close</button>
                      <button
                        onClick={saveEdit}
                        disabled={!editing?.name.trim()}
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
