import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import {
  SUBMISSION_PUBLIC_COLUMNS,
  resolveSubmissionNames,
  summarizeSubmission,
} from '@/lib/queries/submissions';

const PAGE_SIZE = 20;

export type AdminSubmissionRow = {
  id: string;
  /** `submissions.created_at` is nullable in the schema. */
  timestamp: string | null;
  user: string;
  problem: string;
  language: string;
  status: string;
  score: string;
  passed: boolean;
  isCompileError: boolean;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { supabase, userId } = await requireActiveAdmin();

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  // Only the ids: this dashboard lists submissions on the admin's own problems,
  // and the names come back from `resolveSubmissionNames` for the current page
  // alone rather than for every problem they have ever written.
  const { data: myProblems } = await supabase
    .from('problems')
    .select('id')
    .eq('created_by', userId);

  const myProblemIds = (myProblems || []).map((p) => p.id);

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
    .select(SUBMISSION_PUBLIC_COLUMNS, { count: 'exact' })
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

  const pageRows = subs || [];
  const { users, problems } = await resolveSubmissionNames(supabase, pageRows, 'staff');

  const rows: AdminSubmissionRow[] = pageRows.map((s) => {
    const summary = summarizeSubmission(s.summary);
    return {
      id: s.id,
      timestamp: s.created_at,
      user: users.get(s.user_id)?.username ?? 'Unknown User',
      problem: problems.get(s.problem_id) ?? 'Unknown Problem',
      language: s.language,
      status: s.status || 'failed',
      score: summary.score,
      passed: s.status === 'passed',
      isCompileError: summary.isCompileError,
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