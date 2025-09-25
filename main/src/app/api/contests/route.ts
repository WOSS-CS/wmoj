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

    // Fetch problems per contest (problems table uses 'contest' foreign key)
    const { data: problemsRaw, error: problemsErr } = await supabase
      .from('problems')
      .select('id,contest')
      .in('contest', contestIds);

    if (problemsErr) {
      console.warn('[contests API] problems aggregation error:', problemsErr);
    }
    interface ProblemRow { id: string; contest: string | null }
    const problemsCountMap: Record<string, number> = {};
    (problemsRaw as ProblemRow[] | null | undefined)?.forEach(({ contest }) => {
      if (!contest) return;
      problemsCountMap[contest] = (problemsCountMap[contest] || 0) + 1;
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


