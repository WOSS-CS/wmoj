import AdminDashboardClient from './AdminDashboardClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export default async function AdminDashboardPage() {
  const supabase = await getServerSupabase();

  // Fetch ALL submissions (no FK constraints exist, so we join manually)
  const { data: subs, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, code, results, summary, status, problem_id, user_id')
    .order('created_at', { ascending: false });

  if (subsErr) {
    console.error('Admin recent submissions error:', subsErr);
  }

  const rows = subs || [];

  // Collect unique IDs for batch lookup
  const problemIds = [...new Set(rows.map((s: any) => s.problem_id).filter(Boolean))];
  const userIds = [...new Set(rows.map((s: any) => s.user_id).filter(Boolean))];

  // Fetch problem names
  const problemMap = new Map<string, string>();
  if (problemIds.length > 0) {
    const { data: problems } = await supabase
      .from('problems')
      .select('id, name')
      .in('id', problemIds);
    (problems || []).forEach((p: any) => problemMap.set(p.id, p.name));
  }

  // Fetch user names
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    (users || []).forEach((u: any) => userMap.set(u.id, u.username || u.email || 'Unknown User'));
  }

  const submissions = rows.map((s: any) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);

    return {
      id: s.id,
      timestamp: s.created_at,
      user: userMap.get(s.user_id) || 'Unknown User',
      problem: problemMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      code: s.code || '',
      results: s.results as any || null,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
    };
  });

  return <AdminDashboardClient initialSubmissions={submissions} />;
}
