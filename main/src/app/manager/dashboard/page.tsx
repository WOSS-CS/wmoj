import { redirect } from 'next/navigation';
import ManagerDashboardClient from './ManagerDashboardClient';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';

const PAGE_SIZE = 20;

export type ManagerSubmissionRow = {
  id: string;
  timestamp: string;
  user: string;
  problem: string;
  language: string;
  status: string;
  score: string;
  passed: boolean;
  isCompileError: boolean;
};

type RawSub = {
  id: string; created_at: string; language: string;
  status: string; summary: unknown;
  problem_id: string; user_id: string;
};

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { supabase } = await requireActiveManager();

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const { data: subs, count, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, status, summary, problem_id, user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (subsErr) {
    console.error('Manager recent submissions error:', subsErr);
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({}, effectivePage));
  }

  const pageRows = (subs || []) as RawSub[];

  const problemIds = [...new Set(pageRows.map((s) => s.problem_id).filter(Boolean))];
  const userIds = [...new Set(pageRows.map((s) => s.user_id).filter(Boolean))];

  const [problemsRes, usersRes] = await Promise.all([
    problemIds.length > 0
      ? supabase.from('problems').select('id, name').in('id', problemIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> | null }),
    userIds.length > 0
      ? supabase.from('users').select('id, username, email').in('id', userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; username: string; email: string }> | null }),
  ]);

  const problemMap = new Map<string, string>();
  (problemsRes.data || []).forEach((p: { id: string; name: string }) => problemMap.set(p.id, p.name));
  const userMap = new Map<string, string>();
  (usersRes.data || []).forEach((u: { id: string; username: string; email: string }) =>
    userMap.set(u.id, u.username || u.email || 'Unknown User'),
  );

  const rows: ManagerSubmissionRow[] = pageRows.map((s) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number; verdict?: string } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);
    return {
      id: s.id,
      timestamp: s.created_at,
      user: userMap.get(s.user_id) || 'Unknown User',
      problem: problemMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
      isCompileError: summary?.verdict === 'CE',
    };
  });

  return (
    <ManagerDashboardClient
      initialSubmissions={rows}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  );
}