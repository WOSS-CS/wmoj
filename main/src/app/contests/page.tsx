import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages } from '@/lib/pagination';
import { Contest } from '@/types/contest';
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

  let activeContests: Contest[] = [];
  let pastContests: Contest[] = [];
  let pastTotalPages = 1;
  let fetchError: string | undefined;

  try {
    const isoNow = new Date().toISOString();

    // Active contests (ongoing + upcoming): ends_at in the future, no pagination needed
    const { data: activeRaw, error: activeErr } = await supabase
      .from('contests')
      .select('*')
      .eq('is_active', true)
      .gt('ends_at', isoNow)
      .order('starts_at', { ascending: true });

    if (activeErr) {
      fetchError = 'Failed to fetch contests';
    } else {
      // Past contests (virtual): is_active=true and ends_at in past, OR no time window set
      const { data: pastRaw, count: pastCount, error: pastErr } = await supabase
        .from('contests')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .or(`ends_at.lt.${isoNow},and(starts_at.is.null,ends_at.is.null)`)
        .order('ends_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (pastErr) {
        fetchError = 'Failed to fetch contests';
      } else {
        pastTotalPages = computeTotalPages(pastCount, PAST_PAGE_SIZE);

        const allContests = [...(activeRaw || []), ...(pastRaw || [])];
        const contestIds = allContests.map(c => c.id);

        const participantsCountMap: Record<string, number> = {};
        const problemsCountMap: Record<string, number> = {};

        if (contestIds.length > 0) {
          const [participantsResult, problemsResult] = await Promise.all([
            supabase
              .from('contest_participants')
              .select('contest_id')
              .in('contest_id', contestIds),
            // `problems` has no `contest` column — membership lives in the
            // contest_problems junction, so count junction rows and use an
            // inner embed to keep only the active problems.
            supabase
              .from('contest_problems')
              .select('contest_id, problems!inner(is_active)')
              .in('contest_id', contestIds)
              .eq('problems.is_active', true),
          ]);

          const { data: participantsRaw, error: participantsErr } = participantsResult;
          if (!participantsErr) {
            interface ParticipantRow { contest_id: string }
            (participantsRaw as ParticipantRow[] | null | undefined)?.forEach(({ contest_id }) => {
              if (!contest_id) return;
              participantsCountMap[contest_id] = (participantsCountMap[contest_id] || 0) + 1;
            });
          }

          const { data: problemsRaw, error: problemsErr } = problemsResult;
          if (!problemsErr) {
            interface ContestProblemRow { contest_id: string }
            (problemsRaw as ContestProblemRow[] | null | undefined)?.forEach(({ contest_id }) => {
              if (!contest_id) return;
              problemsCountMap[contest_id] = (problemsCountMap[contest_id] || 0) + 1;
            });
          }
        }

        const enrich = (c: Contest) => ({
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
