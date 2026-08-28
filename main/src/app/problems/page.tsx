import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ProblemsClient from './ProblemsClient';
import { CONTEST_GATE_COLUMNS } from '@/lib/queries/contests';
import { PROBLEM_LIST_COLUMNS } from '@/lib/queries/problems';
import { ProblemListItem } from '@/types/problem';
import { getContestStatus } from '@/utils/contestStatus';

export type HotProblem = ProblemListItem & { submission_count: number };

const PAGE_SIZE = 20;

/** How many hot problems the rail actually renders. */
const HOT_PROBLEM_COUNT = 5;

/**
 * How many ranked problems to ask the database for. Deliberately larger
 * than `HOT_PROBLEM_COUNT`: the ranking is global, but the rail may only
 * show problems that are `is_active` and not held back by an ongoing or
 * upcoming contest. Taking the global top five and *then* filtering — what
 * this page used to do — silently renders three or four hot problems on
 * any day a contest is live. Ranking a wider candidate set and slicing
 * after the filter keeps the same visible semantics and actually fills the
 * rail. The RPC clamps this to 100 internally.
 */
const HOT_CANDIDATE_COUNT = 25;

/** One row of `public.top_submitted_problems`. `submission_count` is a bigint. */
interface RankedProblem {
  problem_id: string;
  submission_count: number | string;
}


/**
 * Shown whenever a lookup this page depends on fails. The contest lookups use it
 * too: rendering a partial list is not a degraded experience here, it is a leak.
 */
function ProblemsFetchError() {
  return (
    <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
      <p className="text-sm text-error mb-2">Failed to fetch problems</p>
    </div>
  );
}
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
  //
  // FAIL CLOSED. A discarded error here yields no hidden contests, hence no
  // excluded problems, hence the entire problem set of every ongoing and
  // upcoming contest published on a page anyone can read — the exact outcome
  // the exclusion below exists to prevent. A transient read failure must not
  // be able to open the contest.
  const { data: allContests, error: contestsError } = await supabase
    .from('contests')
    .select(CONTEST_GATE_COLUMNS);

  if (contestsError) {
    console.error('[ProblemsPage] contest lookup failed; refusing to render an unfiltered list:', contestsError);
    return <ProblemsFetchError />;
  }

  // 'upcoming' is hidden for the same reason as 'ongoing', not a weaker one: a
  // scheduled contest's problem set must not be enumerable, readable or
  // submittable before the start bell. Listing them lets an entrant solve the
  // contest days early and walk in finished.
  const hiddenContestIds = (allContests || [])
    .filter(c => {
      const status = getContestStatus(c);
      return status === 'ongoing' || status === 'upcoming';
    })
    .map(c => c.id);

  // Get problem IDs that are in ongoing or upcoming contests (these are excluded)
  let excludedProblemIds: string[] = [];
  if (hiddenContestIds.length > 0) {
    // Fail closed for the same reason: an error here empties the exclusion list
    // while `hiddenContestIds` is non-empty, which is precisely the case where
    // something needed hiding.
    const { data: cpRows, error: cpError } = await supabase
      .from('contest_problems')
      .select('problem_id')
      .in('contest_id', hiddenContestIds);
    if (cpError) {
      console.error('[ProblemsPage] contest_problems lookup failed; refusing to render an unfiltered list:', cpError);
      return <ProblemsFetchError />;
    }
    excludedProblemIds = (cpRows || []).map((r: { problem_id: string }) => r.problem_id);
  }

  let query = supabase
    .from('problems')
    .select(PROBLEM_LIST_COLUMNS, { count: 'exact' })
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
    return <ProblemsFetchError />;
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

  const problemList = problems || [];

  // Hot problems: ranked in the database, never in JS.
  //
  // This used to be `select('problem_id')` over the whole `submissions`
  // table with no limit, no ORDER BY and a discarded error, tallied in a
  // JS object. PostgREST caps an unbounded result set and answers the
  // overflow with HTTP 206 Partial Content, which `postgrest-js` reports as
  // success — so past the cap the page received a truncated slice of an
  // arbitrarily-ordered table with `error: null` and published a
  // confidently wrong top five. Aggregates are disabled over REST on this
  // project (PGRST123), so the ranking lives in a SQL function instead:
  // `top_submitted_problems` is STABLE / SECURITY INVOKER, so the
  // `submissions` RLS policy still applies and the count is complete.
  let hotProblems: HotProblem[] = [];

  const { data: rankedData, error: rankedError } = await supabase.rpc('top_submitted_problems', {
    limit_count: HOT_CANDIDATE_COUNT,
  });

  // Degradation, decided deliberately: the paginated list above IS this
  // page; the hot rail is a garnish on it. A failure to rank therefore
  // drops the rail and logs, rather than replacing the whole problem list
  // with the error card — refusing to show 80 problems because five of
  // them could not be ordered is the worse outcome. What it must never do
  // again is fail *silently*: every branch below either uses the data or
  // reports why it could not.
  if (rankedError) {
    console.error('[ProblemsPage] top_submitted_problems rpc error:', rankedError);
  } else {
    const ranked = (rankedData as RankedProblem[] | null) || [];
    // bigint arrives as a JSON number, but coerce rather than trust it.
    const countById = new Map(ranked.map(r => [r.problem_id, Number(r.submission_count) || 0]));
    const candidateIds = ranked.map(r => r.problem_id);

    if (candidateIds.length > 0) {
      // Bounded by `candidateIds`, so this one cannot be truncated: at most
      // HOT_CANDIDATE_COUNT rows can match. Submissions carry no FK to
      // problems, so a ranked id may have no row here at all — the join is
      // an inner one on purpose and orphans simply drop out.
      let hotQuery = supabase
        .from('problems')
        .select(PROBLEM_LIST_COLUMNS)
        .in('id', candidateIds)
        .eq('is_active', true);

      if (excludedProblemIds.length > 0) {
        hotQuery = hotQuery.not('id', 'in', `(${excludedProblemIds.join(',')})`);
      }

      const { data: hotData, error: hotError } = await hotQuery;

      if (hotError) {
        console.error('[ProblemsPage] hot problems fetch error:', hotError);
      } else {
        hotProblems = (hotData || [])
          .map(p => ({ ...p, submission_count: countById.get(p.id) ?? 0 }))
          // Mirrors the RPC's own `count desc, problem_id asc`, so the slice
          // below is deterministic instead of depending on `.in()`'s row order.
          .sort((a, b) => b.submission_count - a.submission_count || a.id.localeCompare(b.id))
          .slice(0, HOT_PROBLEM_COUNT);
      }
    }
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
