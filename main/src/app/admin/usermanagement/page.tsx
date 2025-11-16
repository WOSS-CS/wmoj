'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminSidebar } from '@/components/AdminSidebar';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import DataTable, { type DataTableColumn } from '@/components/DataTable';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminUserManagementPage() {
  const { user, signOut } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/users/list', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (filter === 'active' && !u.is_active) return false;
      if (filter === 'disabled' && u.is_active) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, filter, search]);

  const handleToggle = async (userId: string, nextActive: boolean) => {
    const prev = users;
    setUsers(prev.map(u => u.id === userId ? { ...u, is_active: nextActive } : u));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const resp = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, is_active: nextActive })
      });
      if (!resp.ok) {
        // revert
        setUsers(prev);
      }
    } catch {
      setUsers(prev);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
          {/* Top Navigation Bar */}
          <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
                Admin: {user?.user_metadata?.username || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Sign Out
              </button>
            </div>
          </nav>

          <div className="flex">
            <AdminSidebar />

            <main className="flex-1 p-8">
              <LoadingState 
                isLoading={!isLoaded}
                skeleton={
                  <div className="mb-8 space-y-4">
                    <SkeletonText lines={2} width="60%" />
                    <SkeletonText lines={1} width="40%" />
                  </div>
                }
              >
                <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <h1 className="text-4xl font-bold text-white mb-4 relative">
                    User Management
                    <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" />
                  </h1>
                  <p className="text-gray-300 text-lg">View and disable/enable regular users.</p>
                </div>
              </LoadingState>

              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by username or email..."
                    className="flex-1 px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg border ${filter==='all'?'text-red-400 border-red-400/40 bg-red-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>All</button>
                    <button onClick={() => setFilter('active')} className={`px-3 py-2 rounded-lg border ${filter==='active'?'text-red-400 border-red-400/40 bg-red-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>Active</button>
                    <button onClick={() => setFilter('disabled')} className={`px-3 py-2 rounded-lg border ${filter==='disabled'?'text-red-400 border-red-400/40 bg-red-400/10':'text-gray-300 border-white/10 hover:bg-white/10'}`}>Disabled</button>
                  </div>
                </div>

                <LoadingState isLoading={loading} skeleton={<SkeletonText lines={6} />}>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No users match your filters.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      {(() => {
                        type Row = ManagedUser;
                        const columns: Array<DataTableColumn<Row>> = [
                          {
                            key: 'username',
                            header: 'Username',
                            className: 'w-[25%]',
                            sortable: true,
                            sortAccessor: (r) => r.username.toLowerCase(),
                            render: (r) => <span className="text-white font-medium">{r.username}</span>,
                          },
                          {
                            key: 'email',
                            header: 'Email',
                            className: 'w-[35%]',
                            sortable: true,
                            sortAccessor: (r) => r.email.toLowerCase(),
                            render: (r) => <span className="text-gray-300">{r.email}</span>,
                          },
                          {
                            key: 'status',
                            header: 'Status',
                            className: 'w-[15%]',
                            sortable: true,
                            sortAccessor: (r) => (r.is_active ? 1 : 0),
                            render: (r) => (
                              <span className={`px-2 py-1 rounded text-xs border ${r.is_active ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'}`}>
                                {r.is_active ? 'Active' : 'Disabled'}
                              </span>
                            ),
                          },
                          {
                            key: 'actions',
                            header: 'Actions',
                            className: 'w-[25%]',
                            render: (r) => (
                              <button
                                onClick={() => handleToggle(r.id, !r.is_active)}
                                className={`px-3 py-2 rounded-lg transition-colors duration-300 ${r.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                              >
                                {r.is_active ? 'Disable' : 'Enable'}
                              </button>
                            ),
                          },
                        ];
                        return (
                          <DataTable<Row>
                            columns={columns}
                            rows={filteredUsers}
                            rowKey={(r) => r.id}
                            headerVariant="red"
                          />
                        );
                      })()}
                    </div>
                  )}
                </LoadingState>
              </div>
            </main>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}


