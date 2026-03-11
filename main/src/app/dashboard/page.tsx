import { getServerSupabase } from '@/lib/supabaseServer';
import DashboardClient from './DashboardClient';
import { Activity } from '@/types/activity';

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  
  let initialActivities: Activity[] = [];
  
  if (authData?.user && !authErr) {
    const userId = authData.user.id;
    
    // logic from route.ts
    const [submissionsResult, contestJoinsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, problem_id, created_at, summary, problems(id, name, contest)')
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

    const { data: submissions } = submissionsResult;
    const { data: contestJoins } = contestJoinsResult;

    const contestIdSet = new Set<string>();
    for (const sub of submissions || []) {
      const problem = Array.isArray(sub.problems) ? sub.problems[0] : sub.problems;
      const c = problem?.contest;
      if (c) contestIdSet.add(c as string);
    }
    
    let contestNameById: Record<string, string> = {};
    if (contestIdSet.size > 0) {
      const { data: contestsData } = await supabase
        .from('contests')
        .select('id, name')
        .in('id', Array.from(contestIdSet));
      if (contestsData) {
        contestNameById = contestsData.reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
          acc[c.id] = c.name;
          return acc;
        }, {});
      }
    }

    const activities: Activity[] = [];

    if (submissions) {
      for (const sub of submissions) {
        const problem = Array.isArray(sub.problems) ? sub.problems[0] : sub.problems;
        const s = (sub.summary || {}) as { total?: number; passed?: number; failed?: number };
        const total = Number(s.total ?? 0);
        const passed = Number(s.passed ?? 0);
        const failed = Number(s.failed ?? 0);
        const solved = total > 0 && failed === 0 && passed === total;
        const contestId = problem?.contest as string | null | undefined;
        const contestName = contestId ? contestNameById[contestId] : undefined;
        
        activities.push({
          id: `sub-${sub.id}`,
          type: 'submission',
          action: solved ? 'Solved' : 'Attempted',
          item: problem?.name || 'Unknown Problem',
          itemId: sub.problem_id,
          timestamp: sub.created_at,
          status: solved ? 'success' : 'warning',
          passed,
          total,
          contestId: contestId || null,
          contestName: contestName || null,
        } as Activity);
      }
    }

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
        } as Activity);
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    initialActivities = activities;
  }

  return <DashboardClient initialActivities={initialActivities} />;
}
