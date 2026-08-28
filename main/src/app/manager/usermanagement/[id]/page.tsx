import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerUserDetailClient from './ManagerUserDetailClient';

const PAGE_SIZE = 20;

export type UserSubmissionRow = {
  id: string;
  timestamp: string;
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
  problem_id: string;
};

export default async function ManagerUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id: targetUserId } = await params;
  const { supabase, userId } = await requireActiveManager();

  const [
    { data: targetUser },
    { data: adminRow },
    { data: targetManagerRow },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, email, created_at')
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
  ]);

  if (!targetUser) redirect('/manager/usermanagement');

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  // The paged query below already carries `count: 'exact'` over exactly this
  // predicate, so a separate total-submissions count was always the same number
  // fetched twice. Only the "passed" subset needs its own query.
  const [
    { count: acceptedSubmissions },
    { data: subs, count, error: subsErr },
  ] = await Promise.all([
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('status', 'passed'),
    supabase
      .from('submissions')
      .select('id, created_at, language, status, summary, problem_id', { count: 'exact' })
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  if (subsErr) {
    console.error('Manager user detail submissions error:', subsErr);
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({}, effectivePage));
  }

  const pageRows = (subs || []) as RawSub[];

  const problemIds = [...new Set(pageRows.map((s) => s.problem_id).filter(Boolean))];
  const problemMap = new Map<string, string>();
  if (problemIds.length > 0) {
    const { data: problems } = await supabase
      .from('problems')
      .select('id, name')
      .in('id', problemIds as string[]);
    (problems || []).forEach((p: { id: string; name: string }) => problemMap.set(p.id, p.name));
  }

  const submissions: UserSubmissionRow[] = pageRows.map((s) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number; verdict?: string } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);
    return {
      id: s.id,
      timestamp: s.created_at,
      problem: problemMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
      isCompileError: summary?.verdict === 'CE',
    };
  });

  return (
    <ManagerUserDetailClient
      user={{
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        created_at: targetUser.created_at,
      }}
      initialIsAdmin={!!adminRow}
      initialIsManager={!!targetManagerRow}
      currentUserId={userId}
      initialSubmissions={submissions}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
      totalSubmissions={count ?? 0}
      acceptedSubmissions={acceptedSubmissions ?? 0}
    />
  );
}