'use client';

import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { TableBodySkeleton } from '@/components/TableBodySkeleton';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { buildPageHref } from '@/lib/pagination';
import type { UserRow } from './page';

const PAGE_SIZE = 25;

interface UsersClientProps {
  initialUsers: UserRow[];
  totalPages: number;
  currentPage: number;
  currentSearch: string;
  currentSort: string;
  fetchError?: string;
}

export default function UsersClient({
  initialUsers,
  totalPages,
  currentPage,
  currentSearch,
  currentSort,
  fetchError,
}: UsersClientProps) {
  const currentParams: Record<string, string | undefined> = {
    search: currentSearch || undefined,
    sort: currentSort !== 'points' ? currentSort : undefined,
  };

  const { displayPage, isLoading, handlePageChange, handleFilterChange, startTransition, buildHref } =
    usePaginatedNavigation({ currentPage, totalPages, currentParams });

  const search = useDebouncedSearch({
    param: 'search',
    initialValue: currentSearch,
    preserveParams: { sort: currentSort !== 'points' ? currentSort : undefined },
    startTransition,
  });

  const sortParams = (sort: string) => ({
    ...currentParams,
    sort: sort !== 'points' ? sort : undefined,
  });

  const rankOffset = (displayPage - 1) * PAGE_SIZE;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Leaderboard</h1>
      </div>

      {fetchError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
          displayPage={displayPage}
          loading={isLoading}
          onPageChange={handlePageChange}
        />
        <input
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder="Search by handle..."
          className="w-1/4 h-8 px-3 rounded-md bg-surface-1 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-surface-2">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-12 text-center">
                  #
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Username
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide w-32 text-right">
                  <Link
                    href={buildPageHref(sortParams('points'), 1)}
                    onClick={(e) => { e.preventDefault(); handleFilterChange({ sort: 'points' }); }}
                    className={`hover:text-foreground transition-colors ${currentSort === 'points' ? 'text-brand-primary' : 'text-text-muted'}`}
                  >
                    Points{currentSort === 'points' ? ' \u25BC' : ''}
                  </Link>
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide w-32 text-right">
                  <Link
                    href={buildPageHref(sortParams('problems'), 1)}
                    onClick={(e) => { e.preventDefault(); handleFilterChange({ sort: 'problems' }); }}
                    className={`hover:text-foreground transition-colors ${currentSort === 'problems' ? 'text-brand-primary' : 'text-text-muted'}`}
                  >
                    Problems{currentSort === 'problems' ? ' \u25BC' : ''}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableBodySkeleton rows={PAGE_SIZE} columns={4} columnWidths={['8%', '40%', '20%', '20%']} />
              ) : initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-text-muted text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                initialUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-muted font-mono text-center align-middle">
                      {rankOffset + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium align-middle">
                      <Link href={`/users/${user.username}`} className="text-brand-primary hover:underline">
                        {user.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground text-right align-middle">
                      {Math.round(user.points)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground text-right align-middle">
                      {user.problems_solved}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
