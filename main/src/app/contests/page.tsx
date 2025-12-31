'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Contest } from '@/types/contest';
import { Badge } from '@/components/ui/Badge';

export default function ContestsPage() {
  const { user, signOut, session } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedContestId, setJoinedContestId] = useState<string | null>(null);
  const [loadingParticipation, setLoadingParticipation] = useState(false);
  const [joinedHistory, setJoinedHistory] = useState<Set<string>>(new Set());
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/contests');
        const json = await res.json();
        if (res.ok) {
          setContests(json.contests || []);
        } else {
          setError(json.error || 'Failed to fetch contests');
        }
      } catch {
        setError('Failed to fetch contests');
      } finally {
        setLoading(false);
      }
    })();
    setIsLoaded(true);
    // Mouse listener removed
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      setLoadingParticipation(true);
      fetch('/api/contests/participation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(json => {
          if (json.contest_id) {
            setJoinedContestId(json.contest_id);
          }
        })
        .catch(e => console.error('Error checking participation:', e))
        .finally(() => setLoadingParticipation(false));

      fetch('/api/contests/join-history', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(json => {
          if (Array.isArray(json.contest_ids)) {
            setJoinedHistory(new Set<string>(json.contest_ids));
          }
        })
        .catch(e => console.error('Error fetching join history:', e));
    }
  }, [session?.access_token]);

  const filteredContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contests;
    return contests.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }, [contests, search]);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="relative overflow-hidden">
          {/* Legacy nav and sidebar removed. Background animations kept but container simplified. */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-20 w-2 h-2 bg-brand-primary/50 rounded-full animate-ping"></div>
          </div>

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
                Available Contests
                <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-brand-primary to-emerald-400 rounded-full animate-pulse" />
              </h1>
              <p className="text-gray-300 text-lg">
                Browse and join available contests
              </p>
            </div>
          </LoadingState>

          {loading && (
            <div className="py-6">
              <CardLoading count={6} />
              <div className="flex justify-center items-center py-8">
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-label="Loading contests" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4 glass-panel p-6">
              {contests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-bounce">⏳</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">No Contests Available</h3>
                  <p className="text-gray-300">Please check back later.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search contests by name or description..."
                      className="w-full px-4 py-2 rounded-lg bg-surface-1 border border-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {filteredContests.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-2xl font-semibold text-white mb-2">No Contests Found</h3>
                      <p className="text-gray-300">
                        No contests match your search criteria. Try a different search term.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        type Row = Contest;
                        const columns: Array<DataTableColumn<Row>> = [
                          {
                            key: 'name',
                            header: 'Contest',
                            className: 'w-[35%]',
                            sortable: true,
                            sortAccessor: (r) => (r.name || '').toLowerCase(),
                            render: (r) => (
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-white font-semibold">
                                  {r.name || 'Untitled Contest'}
                                </h3>
                                {(r.problems_count ?? 0) > 0 && (
                                  <Badge variant="neutral">{(r.problems_count ?? 0)} problem{(r.problems_count ?? 0) === 1 ? '' : 's'}</Badge>
                                )}
                              </div>
                            ),
                          },
                          {
                            key: 'length',
                            header: 'Duration',
                            className: 'w-[15%]',
                            sortable: true,
                            sortAccessor: (r) => r.length,
                            render: (r) => (
                              <span className="text-white font-medium">{r.length} min</span>
                            ),
                          },
                          {
                            key: 'status',
                            header: 'Status',
                            className: 'w-[15%]',
                            sortable: true,
                            sortAccessor: (r) => (r.is_active ? 1 : 0),
                            render: (r) => (
                              <Badge variant={r.is_active ? 'success' : 'neutral'}>
                                {r.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            ),
                          },
                          {
                            key: 'participants',
                            header: 'Participants',
                            className: 'w-[15%]',
                            sortable: true,
                            sortAccessor: (r) => r.participants_count ?? 0,
                            render: (r) => (
                              <span className="text-gray-300 text-sm">
                                {(r.participants_count ?? 0)} participant{(r.participants_count ?? 0) === 1 ? '' : 's'}
                              </span>
                            ),
                          },
                          {
                            key: 'actions',
                            header: 'Actions',
                            className: 'w-[20%]',
                            render: (r) => (
                              <>
                                {joinedContestId === r.id ? (
                                  <Link
                                    href={`/contests/${r.id}`}
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors duration-300 text-sm"
                                  >
                                    Continue
                                  </Link>
                                ) : joinedHistory.has(r.id) ? (
                                  <Link
                                    href={`/contests/${r.id}/leaderboard`}
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors duration-300 text-sm"
                                  >
                                    Spectate
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/contests/${r.id}/view`}
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-300 text-sm"
                                  >
                                    View
                                  </Link>
                                )}
                              </>
                            ),
                          },
                        ];
                        return (
                          <DataTable<Contest>
                            columns={columns}
                            rows={filteredContests}
                            rowKey={(r) => r.id}
                            headerVariant="gray"
                            className="shadow-inner"
                          />
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
