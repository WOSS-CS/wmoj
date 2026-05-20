import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerUserDetailClient from './ManagerUserDetailClient';

type TestResult = {
  index: number; passed: boolean; stdout: string; stderr: string;
  exitCode: number | null; timedOut: boolean; expected: string; received: string;
};

export default async function ManagerUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  const [
    { data: targetUser },
    { data: adminRow },
    { data: targetManagerRow },
    { data: subs },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, email, is_active, created_at')
      .eq('id', targetUserId)
      .maybeSingle(),
    supabase
      .from('admins')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle(),
    supabase
      .from('managers')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle(),
    supabase
      .from('submissions')
      .select('id, created_at, language, code, results, summary, status, problem_id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false }),
  ]);

  if (!targetUser) redirect('/manager/usermanagement');

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
    <ManagerUserDetailClient
      user={{
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        is_active: targetUser.is_active,
        created_at: targetUser.created_at,
      }}
      initialIsAdmin={!!adminRow}
      initialIsManager={!!targetManagerRow}
      currentUserId={userId}
      initialSubmissions={submissions}
    />
  );
}
