'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import type { ContestListRow } from '@/lib/queries/contests';
import { Badge } from '@/components/ui/Badge';
import { getContestStatus, formatTimeUntil } from '@/utils/contestStatus';

const PAST_PAGE_SIZE = 10;

interface ContestsClientProps {
  activeContests: ContestListRow[];
  pastContests: ContestListRow[];
  pastTotalPages: number;
  pastCurrentPage: number;
  fetchError?: string;
}

export default function ContestsClient({
  activeContests,
  pastContests,
  pastTotalPages,
  pastCurrentPage,
  fetchError,
}: ContestsClientProps) {
  const { session } = useAuth();

  const fetcher = (url: string) => fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }).then(r => r.json());

  const { data: participation } = useSWR(session?.access_token ? '/api/contests/participation' : null, fetcher);
  const { data: joinHistory } = useSWR(session?.access_token ? '/api/contests/join-history' : null, fetcher);

  // Derived, not mirrored into state through an effect. The effects these
  // replace had no `else`, so once SWR revalidated to `{contest_id: null}` the
  // row kept rendering "Continue →" at a URL that now redirects away.
  const joinedContestId: string | null = participation?.contest_id ?? null;
  const joinedHistory = useMemo(
    () => new Set<string>(Array.isArray(joinHistory?.contest_ids) ? joinHistory.contest_ids : []),
    [joinHistory],
  );

  const ongoingContests = activeContests.filter(c => getContestStatus(c) === 'ongoing');
  const upcomingContests = activeContests.filter(c => getContestStatus(c) === 'upcoming');

  const { displayPage: pastDisplayPage, isLoading: pastIsLoading, handlePageChange: handlePastPageChange, buildHref: buildPastHref } = usePaginatedNavigation({ currentPage: pastCurrentPage, totalPages: pastTotalPages, currentParams: {} });

  const columns: Array<DataTableColumn<ContestListRow>> = [
    {
      key: 'name', header: 'Contest', className: 'w-[45%]', sortable: true, sortAccessor: (r) => (r.name || '').toLowerCase(), render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium text-sm">{r.name || 'Untitled Contest'}</span>
          {(r.problems_count ?? 0) > 0 && <Badge variant="neutral">{r.problems_count} problem{(r.problems_count ?? 0) === 1 ? '' : 's'}</Badge>}
        </div>
      )
    },
    {
      key: 'length', header: 'Duration', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.length,
      render: (r) => {
        const s = getContestStatus(r);
        const timeHint =
          s === 'upcoming' && r.starts_at ? formatTimeUntil(r.starts_at) :
          s === 'ongoing' && r.ends_at ? formatTimeUntil(r.ends_at) :
          null;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">{r.length} min</span>
            {timeHint && (
              <span className="text-xs text-text-muted">
                {s === 'upcoming' ? 'Starts ' : 'Ends '}{timeHint}
              </span>
            )}
          </div>
        );
      }
    },
    { key: 'participants', header: 'Participants', className: 'w-[16%]', sortable: true, sortAccessor: (r) => r.participants_count ?? 0, render: (r) => <span className="text-sm text-text-muted">{r.participants_count ?? 0}</span> },
    {
      key: 'actions', header: '', className: 'w-[24%] text-right', render: (r) => {
        const status = getContestStatus(r);

        if (joinedContestId === r.id) {
          return <Link href={`/contests/${r.id}`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">Continue →</Link>;
        }

        if (status === 'inactive') {
          return <span className="text-sm text-text-muted">Inactive</span>;
        }

        if (joinedHistory.has(r.id)) {
          if (status === 'virtual') {
            return <Link href={`/contests/${r.id}/view`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">Rejoin →</Link>;
          }
          return <Link href={`/contests/${r.id}/leaderboard`} className="text-sm font-medium text-text-muted hover:text-foreground">Spectate</Link>;
        }

        return <Link href={`/contests/${r.id}/view`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">View →</Link>;
      }
    },
  ];

  const renderSection = (title: string, rows: ContestListRow[], emptyMessage: string) => (
    <div className="glass-panel overflow-hidden">
      <div className="bg-surface-2 px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted px-4 py-4">{emptyMessage}</p>
      ) : (
        <DataTable<ContestListRow> columns={columns} rows={rows} rowKey={(r) => r.id} headerVariant="gray" />
      )}
    </div>
  );

  // `pastTotalPages > 0` was a tautology — computeTotalPages never returns less
  // than 1 — which made the designed empty card unreachable and showed three
  // empty bordered panels on a site with no contests instead.
  const hasAnyContests = activeContests.length > 0 || pastContests.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Contests</h1>
        <p className="text-sm text-text-muted">Browse and join available contests</p>
      </div>

      {fetchError ? (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      ) : !hasAnyContests ? (
        <div className="glass-panel p-6">
          <div className="text-center py-12">
            <h3 className="text-base font-medium text-foreground mb-1">No Contests Available</h3>
            <p className="text-sm text-text-muted">Check back later.</p>
          </div>
        </div>
      ) : (
        <>
          {renderSection('Ongoing', ongoingContests, 'No ongoing contests right now.')}
          {renderSection('Upcoming', upcomingContests, 'No upcoming contests scheduled.')}

          {/* Past Contests — paginated */}
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Past Contests</h2>
            </div>
            {pastContests.length === 0 && !pastIsLoading && pastTotalPages <= 1 ? (
              <p className="text-sm text-text-muted px-4 py-4">No past contests yet.</p>
            ) : (
              <>
                {/* `Pagination` renders nothing for a single page; without this
                    guard its padded wrapper still draws an empty strip. */}
                {pastTotalPages > 1 && (
                  <div className="px-4 py-2 border-b border-border">
                    <Pagination
                      currentPage={pastCurrentPage}
                      totalPages={pastTotalPages}
                      buildHref={buildPastHref}
                      displayPage={pastDisplayPage}
                      loading={pastIsLoading}
                      onPageChange={handlePastPageChange}
                    />
                  </div>
                )}
                <DataTable<ContestListRow> columns={columns} rows={pastContests} rowKey={(r) => r.id} headerVariant="gray" loading={pastIsLoading} skeletonRowCount={PAST_PAGE_SIZE} emptyState={<p>No past contests on this page.</p>} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
