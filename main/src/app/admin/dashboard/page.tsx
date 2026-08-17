import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';

const PAGE_SIZE = 20;

export type AdminSubmissionRow = {
  id: string;
  timestamp: string;
  user: string;
  problem: string;
  language: string;
  status: string;
  score: string;
  passed: boolean;
  compileError: string | null;
};

type RawSub = {
  id: string; created_at: string; language: string;
  status: string; summary: unknown;
  problem_id: string; user_id: string;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/');

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const { data: myProblems } = await supabase
    .from('problems')
    .select('id, name')
    .eq('created_by', userId);

  const myProblemIds = (myProblems || []).map((p: { id: string }) => p.id);
  const problemNameMap = new Map<string, string>(
    (myProblems || []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  if (myProblemIds.length === 0) {
    return (
      <AdminDashboardClient
        initialSubmissions={[]}
        currentPage={1}
        totalPages={1}
        totalCount={0}
      />
    );
  }

  const { data: subs, count, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, status, summary, problem_id, user_id', { count: 'exact' })
    .in('problem_id', myProblemIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (subsErr) {
    console.error('Admin recent submissions error:', subsErr);
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({}, effectivePage));
  }

  const pageRows = (subs || []) as RawSub[];

  const userIds = [...new Set(pageRows.map((s) => s.user_id).filter(Boolean))];
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    (usersData || []).forEach((u: { id: string; username: string; email: string }) =>
      userMap.set(u.id, u.username || u.email || 'Unknown User'),
    );
  }

  const rows: AdminSubmissionRow[] = pageRows.map((s) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number; compileError?: string } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);
    return {
      id: s.id,
      timestamp: s.created_at,
      user: userMap.get(s.user_id) || 'Unknown User',
      problem: problemNameMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
      compileError: summary?.compileError ?? null,
    };
  });

  return (
    <AdminDashboardClient
      initialSubmissions={rows}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  );
}