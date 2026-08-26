'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { ProblemListItem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { HotProblem } from './page';

const PAGE_SIZE = 20;

export default function ProblemsClient({
  initialProblems,
  hotProblems,
  totalPages,
  currentPage,
  currentSearch,
}: {
  initialProblems: ProblemListItem[],
  hotProblems: HotProblem[],
  totalPages: number,
  currentPage: number,
  currentSearch: string,
}) {
  const { user } = useAuth();
  const currentParams: Record<string, string | undefined> = {
    search: currentSearch || undefined,
  };

  const { displayPage, isLoading, handlePageChange, startTransition, buildHref } =
    usePaginatedNavigation({ currentPage, totalPages, currentParams });

  const search = useDebouncedSearch({
    param: 'search',
    initialValue: currentSearch,
    preserveParams: {},
    startTransition,
  });

  const fetcher = async () => {
    if (!user?.id || initialProblems.length === 0) return {};
    const problemIds = initialProblems.map(p => p.id);
    const { data, error } = await supabase.from('submissions').select('problem_id, summary').eq('user_id', user.id).in('problem_id', problemIds);
    if (error) { console.error('Status load error:', error); return {}; }

    const map: Record<string, 'solved' | 'attempted' | 'not_attempted'> = {};
    for (const id of problemIds) map[id] = 'not_attempted';
    const perProblem: Record<string, { any: boolean; solved: boolean }> = {};
    for (const row of data || []) {
      const pid = row.problem_id as string;
      const s = (row.summary || {}) as { total?: number; passed?: number; failed?: number };
      const total = Number(s.total ?? 0); const passed = Number(s.passed ?? 0); const failed = Number(s.failed ?? 0);
      const solved = total > 0 && failed === 0 && passed === total;
      if (!perProblem[pid]) perProblem[pid] = { any: false, solved: false };
      perProblem[pid].any = true;
      perProblem[pid].solved = perProblem[pid].solved || solved;
    }
    for (const [pid, agg] of Object.entries(perProblem)) { map[pid] = agg.solved ? 'solved' : 'attempted'; }
    return map;
  };

  // The fetcher builds its map from THIS page's problem ids, so the page's
  // identity has to be in the key. Paging and searching are soft navigations:
  // `initialProblems` changes but the component is never remounted, so a key of
  // just the user id serves the cached page-1 map forever and every row on
  // page 2 renders as the grey "not attempted" dash.
  const statusKey = user?.id && initialProblems.length > 0
    ? `problems-status-${user.id}-${initialProblems.map(p => p.id).join(',')}`
    : null;

  const { data: statusMap } = useSWR(statusKey, fetcher);

  const statusByProblem = statusMap || {};

  const columns: Array<DataTableColumn<ProblemListItem>> = [
    { key: 'name', header: 'Problem', className: 'w-[50%]', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium text-sm">{r.name}</span> },
    {
      key: 'points', header: 'Points', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.points,
      render: (r) => <span className="text-foreground font-mono text-sm">{r.points} pts</span>
    },
    {
      key: 'status', header: 'Status', className: 'w-[15%]', render: (r) => {
        const st = statusByProblem[r.id] || 'not_attempted';
        if (st === 'solved') return <Badge variant="success">Solved</Badge>;
        if (st === 'attempted') return <Badge variant="warning">Attempted</Badge>;
        return <Badge variant="neutral">—</Badge>;
      }
    },
    {
      key: 'actions', header: '', className: 'w-[20%] text-right', render: (r) => (
        <Link href={`/problems/${r.id}`} className="text-sm text-brand-primary hover:text-brand-secondary font-medium">
          Solve →
        </Link>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Practice Problems</h1>
        <p className="text-sm text-text-muted">Solve problems to sharpen your skills</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Problem List */}
        <div className="flex-[3] min-w-0">
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Problems</h2>
            </div>
            {initialProblems.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <h3 className="text-base font-medium text-foreground mb-1">
                  {currentSearch ? 'No problems match your search.' : 'No Problems Available'}
                </h3>
                {!currentSearch && <p className="text-sm text-text-muted">Check back later for new problems.</p>}
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    buildHref={buildHref}
                    displayPage={displayPage}
                    loading={isLoading}
                    onPageChange={handlePageChange}
                  />
                </div>
                <DataTable<ProblemListItem> columns={columns} rows={initialProblems} rowKey={(r) => r.id} headerVariant="gray" loading={isLoading} skeletonRowCount={PAGE_SIZE} />
              </>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Problem Search */}
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Problem search</h2>
            </div>
            <div className="p-4 bg-surface-1">
              <input
                value={search.value}
                onChange={e => search.onChange(e.target.value)}
                placeholder="Search problems..."
                className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Hot Problems */}
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Hot problems</h2>
            </div>
            <div className="divide-y divide-border">
              {hotProblems.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-xs">No hot problems yet.</div>
              ) : (
                hotProblems.map((problem, i) => (
                  <div key={problem.id} className="p-4 flex items-center justify-between gap-3 bg-surface-1 hover:bg-surface-2 transition-colors">
                    <Link href={`/problems/${problem.id}`} className="block text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors truncate">
                      {i + 1}. {problem.name}
                    </Link>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-sm font-mono text-text-muted">{problem.points} pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
