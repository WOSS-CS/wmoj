import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import {
  SUBMISSION_PUBLIC_COLUMNS,
  resolveSubmissionNames,
  summarizeSubmission,
} from '@/lib/queries/submissions';
import { USER_DETAIL_COLUMNS } from '@/lib/queries/users';
import ManagerUserDetailClient from './ManagerUserDetailClient';

const PAGE_SIZE = 20;

export type UserSubmissionRow = {
  id: string;
  /** `submissions.created_at` is nullable in the schema. */
  timestamp: string | null;
  problem: string;
  language: string;
  status: string;
  score: string;
  passed: boolean;
  isCompileError: boolean;
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
      .select(USER_DETAIL_COLUMNS)
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
      .select(SUBMISSION_PUBLIC_COLUMNS, { count: 'exact' })
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

  const pageRows = subs || [];
  // Only the problem names are rendered here — the page header already names
  // the one user every row belongs to. The users half of the lookup resolves
  // that single id and rides along in the same `Promise.all`, so it costs a
  // primary-key hit and no extra wall-clock time.
  const { problems } = await resolveSubmissionNames(supabase, pageRows, 'staff');

  const submissions: UserSubmissionRow[] = pageRows.map((s) => {
    const summary = summarizeSubmission(s.summary);
    return {
      id: s.id,
      timestamp: s.created_at,
      problem: problems.get(s.problem_id) ?? 'Unknown Problem',
      language: s.language,
      status: s.status || 'failed',
      score: summary.score,
      passed: s.status === 'passed',
      isCompileError: summary.isCompileError,
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