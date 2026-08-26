import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ProblemsClient from './ProblemsClient';
import { ProblemListItem } from '@/types/problem';
import { getContestStatus } from '@/utils/contestStatus';

export type HotProblem = ProblemListItem & { submission_count: number };

const PAGE_SIZE = 20;

/**
 * The only columns this list is allowed to select. Every row here is serialised
 * into the RSC flight payload for `ProblemsClient`, twenty at a time plus five
 * hot rows, so the list pays for each column twenty-five times over — `content`
 * alone is a full Markdown statement. The answer key can no longer be reached
 * from this table at all (it lives in the staff-only `problem_tests`), but the
 * narrow list is still the rule: never widen this to `*`.
 */
const LIST_COLUMNS = 'id, name, points, is_active, created_at';

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = parsePage(params?.page);
  const search = params?.search?.trim() || '';
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const supabase = await getServerSupabase();

  // Find every contest whose problems must stay off the public list.
  const { data: allContests } = await supabase
    .from('contests')
    .select('id, is_active, starts_at, ends_at');

  // 'upcoming' is hidden for the same reason as 'ongoing', not a weaker one: a
  // scheduled contest's problem set must not be enumerable, readable or
  // submittable before the start bell. Listing them lets an entrant solve the
  // contest days early and walk in finished.
  const hiddenContestIds = (allContests || [])
    .filter(c => {
      const status = getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null });
      return status === 'ongoing' || status === 'upcoming';
    })
    .map(c => c.id);

  // Get problem IDs that are in ongoing or upcoming contests (these are excluded)
  let excludedProblemIds: string[] = [];
  if (hiddenContestIds.length > 0) {
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('problem_id')
      .in('contest_id', hiddenContestIds);
    excludedProblemIds = (cpRows || []).map((r: { problem_id: string }) => r.problem_id);
  }

  let query = supabase
    .from('problems')
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (excludedProblemIds.length > 0) {
    query = query.not('id', 'in', `(${excludedProblemIds.join(',')})`);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: problems, count, error } = await query.range(from, to);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problems</p>
      </div>
    );
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);

  // Out-of-range pages render an empty table whose empty state also hides the
  // paginator, stranding the user with no control to get back. Clamp and
  // redirect instead, carrying the current filter. `redirect()` throws
  // NEXT_REDIRECT, so it must stay outside any try/catch.
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({ search: search || undefined }, effectivePage));
  }

  const problemList = (problems as unknown as ProblemListItem[]) || [];

  // Hot problems: computed from all submissions (lightweight single-column fetch)
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('problem_id')
    .not('problem_id', 'is', null);

  const countMap: Record<string, number> = {};
  for (const s of allSubs || []) {
    const pid = s.problem_id as string;
    if (pid) countMap[pid] = (countMap[pid] || 0) + 1;
  }

  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let hotProblems: HotProblem[] = [];
  if (topIds.length > 0) {
    let hotQuery = supabase
      .from('problems')
      .select(LIST_COLUMNS)
      .in('id', topIds)
      .eq('is_active', true);

    if (excludedProblemIds.length > 0) {
      hotQuery = hotQuery.not('id', 'in', `(${excludedProblemIds.join(',')})`);
    }

    const { data: hotData } = await hotQuery;
    hotProblems = ((hotData as unknown as ProblemListItem[]) || [])
      .map(p => ({ ...p, submission_count: countMap[p.id] || 0 }))
      .sort((a, b) => b.submission_count - a.submission_count);
  }

  return (
    <ProblemsClient
      initialProblems={problemList}
      hotProblems={hotProblems}
      totalPages={totalPages}
      currentPage={currentPage}
      currentSearch={search}
    />
  );
}
