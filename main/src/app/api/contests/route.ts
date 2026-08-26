import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = await getServerSupabase();

    const { data: contests, error } = await supabase
      .from('contests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contests' }, { status: 500 });
    }

    const contestIds = (contests || []).map(c => c.id);

    if (contestIds.length === 0) {
      return NextResponse.json({ contests: [] });
    }

    // Fetch participants for all contests
    const { data: participantsRaw, error: participantsErr } = await supabase
      .from('contest_participants')
      .select('contest_id')
      .in('contest_id', contestIds);

    if (participantsErr) {
      console.warn('[contests API] participants aggregation error:', participantsErr);
    }
    interface ParticipantRow { contest_id: string }
    const participantsCountMap: Record<string, number> = {};
    (participantsRaw as ParticipantRow[] | null | undefined)?.forEach(({ contest_id }) => {
      if (!contest_id) return;
      participantsCountMap[contest_id] = (participantsCountMap[contest_id] || 0) + 1;
    });

    // Fetch active problems per contest. `problems` has no `contest` column —
    // membership lives in the contest_problems junction, so count junction rows
    // and use an inner embed to keep only the active problems.
    const { data: problemsRaw, error: problemsErr } = await supabase
      .from('contest_problems')
      .select('contest_id, problems!inner(is_active)')
      .in('contest_id', contestIds)
      .eq('problems.is_active', true);

    if (problemsErr) {
      console.warn('[contests API] problems aggregation error:', problemsErr);
    }
    interface ContestProblemRow { contest_id: string }
    const problemsCountMap: Record<string, number> = {};
    (problemsRaw as ContestProblemRow[] | null | undefined)?.forEach(({ contest_id }) => {
      if (!contest_id) return;
      problemsCountMap[contest_id] = (problemsCountMap[contest_id] || 0) + 1;
    });

    const enriched = (contests || []).map(c => ({
      ...c,
      participants_count: participantsCountMap[c.id] || 0,
      problems_count: problemsCountMap[c.id] || 0,
    }));

    return NextResponse.json({ contests: enriched });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


