import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    console.log('API: Fetching standalone problems...');
    const supabase = await getServerSupabase();

    // Include problems from virtual contests (ended + active, or no time window)
    // and from inactive contests (problems assigned to a contest that hasn't been activated yet)
    const isoNow = new Date().toISOString();
    const { data: virtualContestsWithEnd } = await supabase
      .from('contests')
      .select('id')
      .eq('is_active', true)
      .lt('ends_at', isoNow);
    const { data: virtualContestsNoWindow } = await supabase
      .from('contests')
      .select('id')
      .eq('is_active', true)
      .is('starts_at', null)
      .is('ends_at', null);
    const { data: inactiveContests } = await supabase
      .from('contests')
      .select('id')
      .eq('is_active', false);
    const virtualIds = [
      ...(virtualContestsWithEnd || []).map((c: { id: string }) => c.id),
      ...(virtualContestsNoWindow || []).map((c: { id: string }) => c.id),
      ...(inactiveContests || []).map((c: { id: string }) => c.id),
    ];

    // `problems` has no `contest` column — contest membership lives in the
    // contest_problems junction. A problem is standalone unless it is attached
    // to a contest outside the virtual/inactive set above.
    const { data: cpRows, error: cpError } = await supabase
      .from('contest_problems')
      .select('problem_id, contest_id');

    if (cpError) {
      console.error('Error fetching contest problems:', cpError);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    const excludedIds = new Set<string>();
    for (const row of cpRows || []) {
      if (!virtualIds.includes(row.contest_id)) excludedIds.add(row.problem_id);
    }

    let query = supabase
      .from('problems')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (excludedIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
    }

    const { data: problems, error } = await query;

    console.log('API: Supabase response:', { problems: problems?.length, error });

    if (error) {
      console.error('Error fetching standalone problems:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    console.log('API: Returning problems:', problems?.length || 0);
    return NextResponse.json({ problems: problems || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
