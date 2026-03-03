'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, TableLoading } from '@/components/LoadingStates';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Contest } from '@/types/contest';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export default function ContestsPage() {
  const { session } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedContestId, setJoinedContestId] = useState<string | null>(null);
  const [joinedHistory, setJoinedHistory] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/contests');
        const json = await res.json();
        if (res.ok) setContests(json.contests || []);
        else setError(json.error || 'Failed to fetch contests');
      } catch { setError('Failed to fetch contests'); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/contests/participation', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      .then(r => r.json()).then(j => { if (j.contest_id) setJoinedContestId(j.contest_id); }).catch(() => { });
    fetch('/api/contests/join-history', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      .then(r => r.json()).then(j => { if (Array.isArray(j.contest_ids)) setJoinedHistory(new Set<string>(j.contest_ids)); }).catch(() => { });
  }, [session?.access_token]);

  const filteredContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contests;
    return contests.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [contests, search]);

  const columns: Array<DataTableColumn<Contest>> = [
    {
      key: 'name', header: 'Contest', className: 'w-[35%]', sortable: true, sortAccessor: (r) => (r.name || '').toLowerCase(), render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium text-sm">{r.name || 'Untitled Contest'}</span>
          {(r.problems_count ?? 0) > 0 && <Badge variant="neutral">{r.problems_count} problem{(r.problems_count ?? 0) === 1 ? '' : 's'}</Badge>}
        </div>
      )
    },
    { key: 'length', header: 'Duration', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.length, render: (r) => <span className="text-sm text-foreground">{r.length} min</span> },
    { key: 'status', header: 'Status', className: 'w-[15%]', sortable: true, sortAccessor: (r) => (r.is_active ? 1 : 0), render: (r) => <Badge variant={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'participants', header: 'Participants', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.participants_count ?? 0, render: (r) => <span className="text-sm text-text-muted">{r.participants_count ?? 0}</span> },
    {
      key: 'actions', header: '', className: 'w-[20%] text-right', render: (r) => {
        if (joinedContestId === r.id) return <Link href={`/contests/${r.id}`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">Continue →</Link>;
        if (joinedHistory.has(r.id)) return <Link href={`/contests/${r.id}/leaderboard`} className="text-sm font-medium text-text-muted hover:text-foreground">Spectate</Link>;
        return <Link href={`/contests/${r.id}/view`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">View →</Link>;
      }
    },
  ];

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Contests</h1>
            <p className="text-sm text-text-muted">Browse and join available contests</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8"><LoadingSpinner size="lg" /></div>
              <TableLoading rows={6} columns={5} />
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          ) : (
            <div className="glass-panel p-6">
              {contests.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-base font-medium text-foreground mb-1">No Contests Available</h3>
                  <p className="text-sm text-text-muted">Check back later.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search contests..."
                      className="w-full max-w-xs h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>
                  {filteredContests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-text-muted">No contests match your search.</p>
                    </div>
                  ) : (
                    <DataTable<Contest> columns={columns} rows={filteredContests} rowKey={(r) => r.id} headerVariant="gray" />
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
