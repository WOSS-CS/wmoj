import { getServerSupabase } from '@/lib/supabaseServer';
import { Contest } from '@/types/contest';
import ContestsClient from './ContestsClient';

export default async function ContestsPage() {
  const supabase = await getServerSupabase();

  let initialContests: Contest[] = [];
  let fetchError: string | undefined;

  try {
    const { data: contests, error } = await supabase
      .from('contests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      fetchError = 'Failed to fetch contests';
    } else if (contests) {
      const contestIds = contests.map(c => c.id);

      let participantsCountMap: Record<string, number> = {};
      let problemsCountMap: Record<string, number> = {};

      if (contestIds.length > 0) {
        // Fetch participants and problems concurrently
        const [participantsResult, problemsResult] = await Promise.all([
          supabase
            .from('contest_participants')
            .select('contest_id')
            .in('contest_id', contestIds),
          supabase
            .from('problems')
            .select('id,contest')
            .in('contest', contestIds)
            .eq('is_active', true)
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
          interface ProblemRow { id: string; contest: string | null }
          (problemsRaw as ProblemRow[] | null | undefined)?.forEach(({ contest }) => {
            if (!contest) return;
            problemsCountMap[contest] = (problemsCountMap[contest] || 0) + 1;
          });
        }
      }

      initialContests = contests.map(c => ({
        ...c,
        participants_count: participantsCountMap[c.id] || 0,
        problems_count: problemsCountMap[c.id] || 0,
      }));
    }
  } catch (err) {
    console.error('[ContestsPage] Error fetching contests:', err);
    fetchError = 'Failed to fetch contests';
  }

  return <ContestsClient initialContests={initialContests} fetchError={fetchError} />;
}
