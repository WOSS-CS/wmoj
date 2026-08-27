import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import SubmissionsClient from './SubmissionsClient';

export interface SubmissionRow {
  id: string;
  user_id: string;
  username: string;
  problem_name: string;
  language: string;
  status: string;
  passed: number;
  total: number;
  created_at: string;
}

export interface SubmissionStats {
  passed: number;
  failed: number;
  timeout: number;
  compile_error: number;
  total: number;
}

const PAGE_SIZE = 20;

/**
 * A free-text filter resolves to a list of ids that is serialised into a
 * PostgREST `in.(…)` query string at ~38 bytes per uuid. A broad term (`a`)
 * matches nearly every row, pushes the request line past the typical 8 KB
 * header buffer and fails the whole query — which used to render as a
 * silently empty table. Anything matching more than this is refused with a
 * "narrow your filter" state instead.
 */
const FILTER_MATCH_LIMIT = 200;

type FilterResolution = { ids: string[] | null; tooBroad: boolean; failed: boolean };

const NO_FILTER: FilterResolution = { ids: null, tooBroad: false, failed: false };

/**
 * Resolve a free-text filter term to the ids it matches, bounded by
 * FILTER_MATCH_LIMIT. One extra row is fetched so "exactly at the limit" and
 * "over the limit" can be told apart.
 */
async function resolveFilterIds(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  table: 'users' | 'problems',
  column: 'username' | 'name',
  term: string,
): Promise<FilterResolution> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .ilike(column, `%${term}%`)
    .limit(FILTER_MATCH_LIMIT + 1);

  if (error) {
    console.error(`[SubmissionsPage] Failed to resolve ${table} filter:`, error);
    return { ids: null, tooBroad: false, failed: true };
  }
  const rows = data || [];
  if (rows.length > FILTER_MATCH_LIMIT) {
    return { ids: null, tooBroad: true, failed: false };
  }
  return { ids: rows.map((r) => r.id as string), tooBroad: false, failed: false };
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    problem?: string;
    user?: string;
    status?: string;
    problem_id?: string;
    user_id?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = parsePage(params?.page);
  const problemSearch = params?.problem?.trim() || '';
  const userSearch = params?.user?.trim() || '';
  // Deep links ("My Submissions" on a profile or a problem page) pass ids, not
  // names. A name is not unique and an unanchored ilike on it matched every
  // `Sum of Two` when you asked for `Sum`; an id filter is exact. The free-text
  // `problem`/`user` params remain for the sidebar's search boxes.
  const problemIdFilter = params?.problem_id?.trim() || '';
  const userIdFilter = params?.user_id?.trim() || '';
  const statusFilter = (['all', 'passed', 'failed'] as const).includes(params?.status as 'all' | 'passed' | 'failed')
    ? (params?.status as 'all' | 'passed' | 'failed')
    : 'all';

  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const supabase = await getServerSupabase();

  let submissions: SubmissionRow[] = [];
  let totalPages = 1;
  const stats: SubmissionStats = { passed: 0, failed: 0, timeout: 0, compile_error: 0, total: 0 };
  let fetchError: string | undefined;
  let statsError = false;
  let filterTooBroad = false;
  // redirect() throws a control-flow signal that the try/catch below would
  // swallow, so the clamp decision is recorded here and acted on afterwards.
  let redirectTo: string | null = null;

  const urlParams = {
    problem: problemSearch || undefined,
    user: userSearch || undefined,
    problem_id: problemIdFilter || undefined,
    user_id: userIdFilter || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  try {
    const userFilter: FilterResolution = userIdFilter
      ? { ids: [userIdFilter], tooBroad: false, failed: false }
      : userSearch
        ? await resolveFilterIds(supabase, 'users', 'username', userSearch)
        : NO_FILTER;

    const problemFilter: FilterResolution = problemIdFilter
      ? { ids: [problemIdFilter], tooBroad: false, failed: false }
      : problemSearch
        ? await resolveFilterIds(supabase, 'problems', 'name', problemSearch)
        : NO_FILTER;

    if (userFilter.failed || problemFilter.failed) {
      fetchError = 'Failed to fetch submissions';
    } else if (userFilter.tooBroad || problemFilter.tooBroad) {
      filterTooBroad = true;
    } else {
      const filteredUserIds = userFilter.ids;
      const filteredProblemIds = problemFilter.ids;

      // The page query below carries `count: 'exact'` over precisely the filter
      // predicate the statistics block wants a total for, so it is captured here
      // rather than counted a second time.
      let matchingTotal = 0;

      // If filter terms produced no matches, short-circuit
      const noResults =
        (filteredUserIds !== null && filteredUserIds.length === 0) ||
        (filteredProblemIds !== null && filteredProblemIds.length === 0);

      if (!noResults) {
        // `results` is deliberately absent: it is the per-case judge output for
        // the whole page and nothing here renders it — the modal fetches it on
        // demand through /api/user/submissions/[id]. `id` is the tiebreaker;
        // created_at alone gives Postgres no stable order across LIMIT/OFFSET
        // queries, so paging 2 → 3 → 2 could show one row twice.
        let query = supabase
          .from('submissions')
          .select('id, user_id, problem_id, language, status, summary, created_at', {
            count: 'exact',
          })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true });

        if (statusFilter === 'passed') query = query.eq('status', 'passed');
        if (statusFilter === 'failed') query = query.neq('status', 'passed');
        if (filteredUserIds !== null) query = query.in('user_id', filteredUserIds);
        if (filteredProblemIds !== null) query = query.in('problem_id', filteredProblemIds);

        const { data: rawSubs, count, error: subsError } = await query.range(from, to);

        if (subsError) {
          console.error('[SubmissionsPage] Failed to fetch submissions:', subsError);
          fetchError = 'Failed to fetch submissions';
        } else {
          matchingTotal = count ?? 0;
          totalPages = computeTotalPages(count, PAGE_SIZE);

          const effectivePage = clampPage(currentPage, totalPages);
          if (effectivePage !== currentPage) {
            redirectTo = buildPageHref(urlParams, effectivePage);
          } else {
            // Fetch only the users and problems referenced on this page
            const userIds = [...new Set((rawSubs || []).map((s) => s.user_id))];
            const problemIds = [...new Set((rawSubs || []).map((s) => s.problem_id))];

            const [usersResult, problemsResult] = await Promise.all([
              userIds.length > 0
                ? supabase.from('users').select('id, username').in('id', userIds)
                : Promise.resolve({ data: [] }),
              problemIds.length > 0
                ? supabase.from('problems').select('id, name').in('id', problemIds)
                : Promise.resolve({ data: [] }),
            ]);

            const userMap = new Map((usersResult.data || []).map((u) => [u.id, u.username]));
            const problemMap = new Map((problemsResult.data || []).map((p) => [p.id, p.name]));

            submissions = (rawSubs || []).map((s) => {
              const summary = s.summary as { passed?: number; total?: number } | null;
              return {
                id: s.id,
                user_id: s.user_id,
                username: userMap.get(s.user_id) ?? 'Unknown',
                problem_name: problemMap.get(s.problem_id) ?? 'Unknown Problem',
                language: s.language,
                status: s.status ?? 'failed',
                passed: summary?.passed ?? 0,
                total: summary?.total ?? 0,
                created_at: s.created_at,
              };
            });
          }
        }
      }

      // Statistics: counted in the database, never materialised. The old
      // version selected `status, summary, results` for the entire filtered
      // set — the whole judge history, per page view, on a page anyone can
      // reach signed out. These are HEAD requests: no row ever crosses the
      // wire.
      //
      // Only buckets a filter can express are counted. Separating a runtime
      // error from a wrong answer needs a per-case scan of `results`, so those
      // rows land in `failed`; restoring that split needs an aggregate RPC.
      if (!redirectTo && !fetchError && !noResults) {
        const countQuery = () => {
          let q = supabase.from('submissions').select('id', { count: 'exact', head: true });
          if (statusFilter === 'passed') q = q.eq('status', 'passed');
          if (statusFilter === 'failed') q = q.neq('status', 'passed');
          if (filteredUserIds !== null) q = q.in('user_id', filteredUserIds);
          if (filteredProblemIds !== null) q = q.in('problem_id', filteredProblemIds);
          return q;
        };

        const [passedRes, compileErrorRes, timeoutRes] = await Promise.all([
          countQuery().eq('status', 'passed'),
          // A compile error is stored as summary {total: 0, passed: 0, failed: 0}.
          countQuery().eq('summary->>total', '0'),
          // Any case that hit the time limit. Matches on the stored per-case
          // `timedOut` flag rather than `verdict`, which older rows set to
          // 'WA' even for a timeout.
          countQuery().neq('status', 'passed').contains('results', '[{"timedOut":true}]'),
        ]);

        const statsErr = passedRes.error || compileErrorRes.error || timeoutRes.error;
        if (statsErr) {
          console.error('[SubmissionsPage] Failed to compute statistics:', statsErr);
          statsError = true;
        } else {
          stats.total = matchingTotal;
          stats.passed = passedRes.count ?? 0;
          stats.compile_error = compileErrorRes.count ?? 0;
          stats.timeout = timeoutRes.count ?? 0;
          stats.failed = Math.max(
            0,
            stats.total - stats.passed - stats.compile_error - stats.timeout,
          );
        }
      }
    }
  } catch (err) {
    console.error('[SubmissionsPage] Error:', err);
    fetchError = 'Failed to fetch submissions';
  }

  if (redirectTo) redirect(redirectTo);

  return (
    <SubmissionsClient
      initialSubmissions={submissions}
      totalPages={totalPages}
      currentPage={currentPage}
      currentProblemSearch={problemSearch}
      currentUserSearch={userSearch}
      currentProblemId={problemIdFilter}
      currentUserId={userIdFilter}
      currentStatusFilter={statusFilter}
      stats={stats}
      statsError={statsError}
      filterTooBroad={filterTooBroad}
      fetchError={fetchError}
    />
  );
}
