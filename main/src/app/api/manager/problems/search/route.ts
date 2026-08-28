import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { getContestStatus } from '@/utils/contestStatus';
import { CONTEST_ELIGIBILITY_COLUMNS } from '@/lib/queries/contests';
import { PROBLEM_PICKER_COLUMNS } from '@/lib/queries/problems';
import { STAFF_POLICY } from '@/lib/staffPolicy';

// Every difference between this route and its twin in the other staff tree is
// read from here — nothing else may differ.
const POLICY = STAFF_POLICY.manager;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const excludeContest = searchParams.get('exclude_contest')?.trim() || null;
    const targetRated = searchParams.get('target_rated') === 'true';

    if (!q || q.length < 1) {
      return NextResponse.json({ problems: [] });
    }

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    // Build the set of problem IDs that should be excluded
    const excludedIds = new Set<string>();

    // Fetch all contests to determine their status
    const { data: allContests } = await supabase
      .from('contests')
      .select(CONTEST_ELIGIBILITY_COLUMNS);

    // Find rated non-virtual (ongoing/upcoming) contest IDs, excluding the contest being edited
    const ratedNonVirtualIds = (allContests || [])
      .filter(c => {
        if (excludeContest && c.id === excludeContest) return false;
        if (!c.is_rated) return false;
        const status = getContestStatus(c);
        return status === 'ongoing' || status === 'upcoming';
      })
      .map(c => c.id);

    // Rule 1: Always exclude problems in rated non-virtual contests
    if (ratedNonVirtualIds.length > 0) {
      const { data: blockedRows } = await supabase
        .from('contest_problems')
        .select('problem_id')
        .in('contest_id', ratedNonVirtualIds);
      for (const row of blockedRows || []) excludedIds.add(row.problem_id);
    }

    // Rule 2: If target contest is rated, exclude problems in ANY other contest
    if (targetRated) {
      const otherContestIds = (allContests || [])
        .filter(c => !excludeContest || c.id !== excludeContest)
        .map(c => c.id);

      if (otherContestIds.length > 0) {
        const { data: inContestRows } = await supabase
          .from('contest_problems')
          .select('problem_id')
          .in('contest_id', otherContestIds);
        for (const row of inContestRows || []) excludedIds.add(row.problem_id);
      }
    }

    // Also exclude problems already in the contest being edited
    if (excludeContest) {
      const { data: alreadyIn } = await supabase
        .from('contest_problems')
        .select('problem_id')
        .eq('contest_id', excludeContest);
      for (const row of alreadyIn || []) excludedIds.add(row.problem_id);
    }

    let query = supabase
      .from('problems')
      .select(PROBLEM_PICKER_COLUMNS)
      .ilike('name', `%${q}%`)
      .limit(20);

    // `scopeToOwner`: the picker offers a caller only the problems they own.
    if (POLICY.scopeToOwner) query = query.eq('created_by', user.id);

    if (excludedIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Manager problem search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ problems: data ?? [] });
  } catch (error) {
    console.error('Manager problem search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
