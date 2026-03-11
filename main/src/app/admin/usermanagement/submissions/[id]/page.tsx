import { getServerSupabase } from '@/lib/supabaseServer';
import UserSubmissionsClient from './UserSubmissionsClient';

type TestResult = {
  index: number; passed: boolean; stdout: string; stderr: string;
  exitCode: number | null; timedOut: boolean; expected: string; received: string;
};

export default async function UserSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const supabase = await getServerSupabase();

  const { data: targetUser } = await supabase
    .from('users')
    .select('id, username, email')
    .eq('id', targetUserId)
    .maybeSingle();

  const { data: subs } = await supabase
    .from('submissions')
    .select('id, created_at, language, code, results, summary, status, problem_id')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  const rows = subs || [];
  const problemIds = [...new Set(rows.map(s => s.problem_id).filter(Boolean))];
  const problemMap = new Map<string, string>();
  
  if (problemIds.length > 0) {
    const { data: problems } = await supabase
      .from('problems')
      .select('id, name')
      .in('id', problemIds as string[]);
    (problems || []).forEach(p => problemMap.set(p.id, p.name));
  }

  const submissions = rows.map((s) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);
    return {
      id: s.id,
      timestamp: s.created_at,
      problem: problemMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      code: s.code,
      results: s.results as TestResult[] | null,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
    };
  });

  return (
    <UserSubmissionsClient 
      initialUsername={targetUser?.username || targetUser?.email || 'User'}
      initialSubmissions={submissions}
    />
  );
}
