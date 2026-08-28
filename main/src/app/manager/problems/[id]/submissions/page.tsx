import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerProblemSubmissionsClient from './ManagerProblemSubmissionsClient';

const PAGE_SIZE = 20;

export type ProblemSubmissionRow = {
  id: string;
  user_id: string;
  username: string;
  email: string;
  language: string;
  status: string;
  summary: { total: number; passed: number; failed: number };
  isCompileError: boolean;
  created_at: string;
};

type RawSub = {
  id: string; created_at: string; language: string;
  status: string; summary: unknown;
  problem_id: string; user_id: string;
};

export default async function ManagerProblemSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const { supabase } = await requireActiveManager();

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  // `.single()` used to swallow its error, so a mistyped slug rendered
  // "Submissions: Problem — 0 total" instead of going anywhere.
  const { data: problem } = await supabase
    .from('problems')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  if (!problem) redirect('/manager/problems/manage');

  const problemName = problem.name || 'Problem';

  const { data: subs, count, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, status, summary, problem_id, user_id', { count: 'exact' })
    .eq('problem_id', id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (subsErr) {
    console.error('Manager problem submissions error:', subsErr);
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({}, effectivePage));
  }

  const pageRows = (subs || []) as RawSub[];

  const userIds = Array.from(new Set(pageRows.map((s) => s.user_id).filter(Boolean)));
  let userMap: Record<string, { username: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    if (!usersError && users) {
      userMap = users.reduce((acc: Record<string, { username: string; email: string }>, u: { id: string; username: string; email: string }) => {
        acc[u.id] = { username: u.username, email: u.email };
        return acc;
      }, {});
    }
  }

  const formattedSubmissions: ProblemSubmissionRow[] = pageRows.map((sub) => {
    const summary = sub.summary as { total?: number; passed?: number; failed?: number; verdict?: string } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);
    const failed = Number(summary?.failed ?? 0);
    const isCompileError = summary?.verdict === 'CE';
    const userInfo = userMap[sub.user_id] || { username: 'Unknown', email: 'Unknown' };
    return {
      id: sub.id,
      user_id: sub.user_id,
      username: userInfo.username,
      email: userInfo.email,
      language: sub.language,
      status: sub.status || 'failed',
      summary: { total, passed, failed },
      isCompileError,
      created_at: sub.created_at,
    };
  });

  return (
    <ManagerProblemSubmissionsClient
      initialSubmissions={formattedSubmissions}
      initialProblemName={problemName}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  );
}