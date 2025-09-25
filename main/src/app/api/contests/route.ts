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
    const participantsCountMap: Record<string, number> = {};
    (participantsRaw || []).forEach(row => {
      const id = (row as any).contest_id; // row shape { contest_id: string }
      participantsCountMap[id] = (participantsCountMap[id] || 0) + 1;
    });

    // Fetch problems per contest (problems table uses 'contest' foreign key)
    const { data: problemsRaw, error: problemsErr } = await supabase
      .from('problems')
      .select('id,contest')
      .in('contest', contestIds);

    if (problemsErr) {
      console.warn('[contests API] problems aggregation error:', problemsErr);
    }
    const problemsCountMap: Record<string, number> = {};
    (problemsRaw || []).forEach(row => {
      const id = (row as any).contest; // row shape { id, contest }
      if (!id) return;
      problemsCountMap[id] = (problemsCountMap[id] || 0) + 1;
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


