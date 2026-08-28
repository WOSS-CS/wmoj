import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { CONTEST_LIST_COLUMNS, type ContestListRow } from '@/lib/queries/contests';
import ContestsClient from './ContestsClient';

const PAST_PAGE_SIZE = 10;

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const pastCurrentPage = parsePage(params?.page);
  const { from, to } = computeRange(pastCurrentPage, PAST_PAGE_SIZE);

  const supabase = await getServerSupabase();

  let activeContests: ContestListRow[] = [];
  let pastContests: ContestListRow[] = [];
  let pastTotalPages = 1;
  let fetchError: string | undefined;
  let redirectTo: string | undefined;

  try {
    const isoNow = new Date().toISOString();

    // The two buckets must partition the active contests exactly the way
    // getContestStatus() does, or a row lands in neither and vanishes from the
    // page. getContestStatus says:
    //   upcoming — starts_at is not null and now < starts_at
    //   ongoing  — starts_at and ends_at are both not null and starts_at <= now <= ends_at
    //   virtual  — everything else (both null, only one set, or already ended)
    // so "current" is `starts_at is not null and (starts_at > now or ends_at >= now)`
    // and the past bucket below is its exact complement. Half-set windows
    // (only a start, or only an end) are legal in the schema, and each used to
    // fall through both queries or be fetched and then filtered away. Being
    // exact complements, neither query reads the other's result — so both go
    // out together.
    const [
      { data: activeRaw, error: activeErr },
      { data: pastRaw, count: pastCount, error: pastErr },
    ] = await Promise.all([
      supabase
        .from('contests')
        .select(CONTEST_LIST_COLUMNS)
        .eq('is_active', true)
        .not('starts_at', 'is', null)
        .or(`starts_at.gt.${isoNow},ends_at.gte.${isoNow}`)
        .order('starts_at', { ascending: true }),
      // Past contests: everything getContestStatus() calls virtual.
      supabase
        .from('contests')
        .select(CONTEST_LIST_COLUMNS, { count: 'exact' })
        .eq('is_active', true)
        .or(
          `starts_at.is.null,` +
          `and(starts_at.lte.${isoNow},ends_at.is.null),` +
          `and(starts_at.lte.${isoNow},ends_at.lt.${isoNow})`
        )
        .order('ends_at', { ascending: false, nullsFirst: false })
        .range(from, to),
    ]);

    if (activeErr || pastErr) {
      fetchError = 'Failed to fetch contests';
    } else {
      pastTotalPages = computeTotalPages(pastCount, PAST_PAGE_SIZE);

      const effectivePage = clampPage(pastCurrentPage, pastTotalPages);
      if (effectivePage !== pastCurrentPage) {
        // Out-of-range ?page — send the user to the real last page instead of
        // rendering an empty table under a paginator pointing at nothing.
        redirectTo = buildPageHref({}, effectivePage);
      } else {
        const allContests = [...(activeRaw || []), ...(pastRaw || [])];
        const contestIds = allContests.map(c => c.id);

        const participantsCountMap: Record<string, number> = {};
        const problemsCountMap: Record<string, number> = {};

        if (contestIds.length > 0) {
          // Both of these count rows client-side, so a truncated response is a
          // wrong number rendered as though it were right: PostgREST answers 206
          // past its cap and `postgrest-js` calls that success. `fetchAllRows`
          // pages until the exact count is in hand, and each query is ordered on
          // its whole primary key — `(contest_id, user_id)` and
          // `(contest_id, problem_id)` — because range paging needs a total order.
          const [participantsResult, problemsResult] = await Promise.all([
            fetchAllRows<{ contest_id: string }>((rangeFrom, rangeTo) =>
              supabase
                .from('contest_participants')
                .select('contest_id', { count: 'exact' })
                .in('contest_id', contestIds)
                .order('contest_id', { ascending: true })
                .order('user_id', { ascending: true })
                .range(rangeFrom, rangeTo),
            ),
            // `problems` has no `contest` column — membership lives in the
            // contest_problems junction, so count junction rows and use an
            // inner embed to keep only the active problems.
            fetchAllRows<{ contest_id: string }>((rangeFrom, rangeTo) =>
              supabase
                .from('contest_problems')
                .select('contest_id, problems!inner(is_active)', { count: 'exact' })
                .in('contest_id', contestIds)
                .eq('problems.is_active', true)
                .order('contest_id', { ascending: true })
                .order('problem_id', { ascending: true })
                .range(rangeFrom, rangeTo),
            ),
          ]);

          // A failed count is logged and left at zero rather than failing the
          // page: the contest list itself is still worth rendering.
          if (participantsResult.error) {
            console.error('[ContestsPage] participants count error:', participantsResult.error);
          }
          for (const { contest_id } of participantsResult.rows) {
            if (!contest_id) continue;
            participantsCountMap[contest_id] = (participantsCountMap[contest_id] || 0) + 1;
          }

          if (problemsResult.error) {
            console.error('[ContestsPage] problems count error:', problemsResult.error);
          }
          for (const { contest_id } of problemsResult.rows) {
            if (!contest_id) continue;
            problemsCountMap[contest_id] = (problemsCountMap[contest_id] || 0) + 1;
          }
        }

        const enrich = (c: ContestListRow) => ({
          ...c,
          participants_count: participantsCountMap[c.id] || 0,
          problems_count: problemsCountMap[c.id] || 0,
        });

        activeContests = (activeRaw || []).map(enrich);
        pastContests = (pastRaw || []).map(enrich);
      }
    }
  } catch (err) {
    console.error('[ContestsPage] Error fetching contests:', err);
    fetchError = 'Failed to fetch contests';
  }

  // redirect() throws — it must run outside the try/catch above, which would
  // otherwise swallow it and render the "Failed to fetch contests" panel.
  if (redirectTo) {
    redirect(redirectTo);
  }

  return (
    <ContestsClient
      activeContests={activeContests}
      pastContests={pastContests}
      pastTotalPages={pastTotalPages}
      pastCurrentPage={pastCurrentPage}
      fetchError={fetchError}
    />
  );
}
