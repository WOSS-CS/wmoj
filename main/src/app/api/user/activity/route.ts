import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    // Verify authenticated user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    // Parallelize fetching submissions and contest joins for better performance.
    //
    // `submissions` has no foreign keys at all, so PostgREST cannot resolve a
    // `problems(...)` embed from pg_constraint — it fails the whole query with
    // PGRST200 and the feed silently loses every submission. Resolve the
    // display names with a second lookup instead, exactly as
    // api/user/submissions/[id] does.
    // The `contests(...)` embed below is fine: join_history.contest_id has a
    // real FK.
    const [submissionsResult, contestJoinsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, problem_id, created_at, summary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('join_history')
        .select('id, contest_id, joined_at, contests(id, name)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(100)
    ]);

    const { data: submissions, error: submissionsErr } = submissionsResult;
    const { data: contestJoins, error: joinsErr } = contestJoinsResult;

    // A half-empty activity feed is indistinguishable from an empty one, so a
    // failed half is an error, not something to log and paper over.
    if (submissionsErr) {
      console.error('Error fetching submissions:', submissionsErr);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
    if (joinsErr) {
      console.error('Error fetching contest joins:', joinsErr);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    // Fetch contest associations for submitted problems via junction table
    const problemIdSet = new Set<string>();
    for (const sub of submissions || []) {
      if (sub.problem_id) problemIdSet.add(sub.problem_id as string);
    }

    // Resolve problem display names for this page of submissions.
    const problemNameById: Record<string, string> = {};
    if (problemIdSet.size > 0) {
      const { data: problemRows, error: problemsErr } = await supabase
        .from('problems')
        .select('id, name')
        .in('id', Array.from(problemIdSet));
      if (problemsErr) {
        console.error('Error fetching problems for submissions:', problemsErr);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
      }
      for (const p of problemRows || []) {
        problemNameById[p.id as string] = p.name as string;
      }
    }

    const problemContestMap: Record<string, string> = {};
    if (problemIdSet.size > 0) {
      const { data: cpRows } = await supabase
        .from('contest_problems')
        .select('problem_id, contest_id')
        .in('problem_id', Array.from(problemIdSet));
      for (const row of cpRows || []) {
        if (!problemContestMap[row.problem_id]) {
          problemContestMap[row.problem_id] = row.contest_id;
        }
      }
    }

    const contestIdSet = new Set<string>(Object.values(problemContestMap));
    let contestNameById: Record<string, string> = {};
    if (contestIdSet.size > 0) {
      const { data: contestsData, error: contestsErr } = await supabase
        .from('contests')
        .select('id, name')
        .in('id', Array.from(contestIdSet));
      if (contestsErr) {
        console.error('Error fetching contests for submissions:', contestsErr);
      } else {
        contestNameById = (contestsData || []).reduce<Record<string, string>>((acc, c: { id: string; name: string }) => {
          acc[c.id] = c.name;
          return acc;
        }, {});
      }
    }

    // Combine and sort activities
    type ActivityResponse = {
      id: string;
      type: 'submission' | 'contest_join';
      action: string;
      item: string;
      itemId: string;
      timestamp: string;
      status: 'success' | 'warning' | 'info';
      passed?: number;
      total?: number;
      contestId?: string | null;
      contestName?: string | null;
    };
    const activities: ActivityResponse[] = [];

    // Add submissions
    if (submissions) {
      for (const sub of submissions) {
        const problemId = sub.problem_id as string | null;
        const s = (sub.summary || {}) as { total?: number; passed?: number; failed?: number };
        const total = Number(s.total ?? 0);
        const passed = Number(s.passed ?? 0);
        const failed = Number(s.failed ?? 0);
        const solved = total > 0 && failed === 0 && passed === total;
        const contestId = problemId ? (problemContestMap[problemId] || null) : null;
        const contestName = contestId ? contestNameById[contestId] : undefined;
        activities.push({
          id: `sub-${sub.id}`,
          type: 'submission',
          action: solved ? 'Solved' : 'Attempted',
          item: (problemId ? problemNameById[problemId] : undefined) || 'Unknown Problem',
          itemId: sub.problem_id,
          timestamp: sub.created_at,
          status: solved ? 'success' : 'warning',
          passed,
          total,
          contestId: contestId || null,
          contestName: contestName || null,
        });
      }
    }

    // Add contest joins
    if (contestJoins) {
      for (const join of contestJoins) {
        const contest = Array.isArray(join.contests) ? join.contests[0] : join.contests;
        activities.push({
          id: `join-${join.id}`,
          type: 'contest_join',
          action: 'Joined',
          item: contest?.name || 'Unknown Contest',
          itemId: join.contest_id,
          timestamp: join.joined_at,
          status: 'info'
        });
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return activities (recent up to fetched limits)
    return NextResponse.json({ activities });
  } catch (e) {
    console.error('Activity fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

