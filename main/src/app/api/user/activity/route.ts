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

    // Fetch recent submissions with problem details
    const { data: submissions, error: submissionsErr } = await supabase
      .from('submissions')
      .select('id, problem_id, created_at, summary, problems(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (submissionsErr) {
      console.error('Error fetching submissions:', submissionsErr);
    }

    // Fetch recent contest joins with contest details
    const { data: contestJoins, error: joinsErr } = await supabase
      .from('join_history')
      .select('id, contest_id, joined_at, contests(id, name)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(5);

    if (joinsErr) {
      console.error('Error fetching contest joins:', joinsErr);
    }

    // Combine and sort activities
    const activities = [];

    // Add submissions
    if (submissions) {
      for (const sub of submissions) {
        const problem = Array.isArray(sub.problems) ? sub.problems[0] : sub.problems;
        activities.push({
          id: `sub-${sub.id}`,
          type: 'submission',
          action: sub.summary?.allPassed ? 'Solved' : 'Attempted',
          item: problem?.name || 'Unknown Problem',
          itemId: sub.problem_id,
          timestamp: sub.created_at,
          status: sub.summary?.allPassed ? 'success' : 'warning'
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

    // Return top 10
    return NextResponse.json({ activities: activities.slice(0, 10) });
  } catch (e) {
    console.error('Activity fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

