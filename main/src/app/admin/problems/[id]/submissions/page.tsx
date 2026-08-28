import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import {
  SUBMISSION_PUBLIC_COLUMNS,
  resolveSubmissionNames,
  summarizeSubmission,
} from '@/lib/queries/submissions';
import ProblemSubmissionsClient from './ProblemSubmissionsClient';

const PAGE_SIZE = 20;

export type ProblemSubmissionRow = {
  id: string;
  user_id: string;
  username: string;
  /** Staff-only; empty when the submitter's `users` row is gone. */
  email: string;
  language: string;
  status: string;
  summary: { total: number; passed: number; failed: number };
  isCompileError: boolean;
  /** `submissions.created_at` is nullable in the schema. */
  created_at: string | null;
};

export default async function ProblemSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const { supabase, userId } = await requireActiveAdmin();

  const sp = await searchParams;
  const currentPage = parsePage(sp.page);
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  // Scoped and checked: `.single()` used to swallow its error, so a mistyped
  // slug rendered "Submissions: Problem — 0 total" instead of going anywhere.
  // The scope matches Manage Problems, which only lists this admin's own rows.
  const { data: problem } = await supabase
    .from('problems')
    .select('name')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();

  if (!problem) redirect('/admin/problems/manage');

  const problemName = problem.name || 'Problem';

  const { data: subs, count, error: subsErr } = await supabase
    .from('submissions')
    .select(SUBMISSION_PUBLIC_COLUMNS, { count: 'exact' })
    .eq('problem_id', id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (subsErr) {
    console.error('Problem submissions error:', subsErr);
  }

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(currentPage, totalPages);
  if (effectivePage !== currentPage) {
    redirect(buildPageHref({}, effectivePage));
  }

  const pageRows = subs || [];
  const { users } = await resolveSubmissionNames(supabase, pageRows, 'staff');

  const formattedSubmissions: ProblemSubmissionRow[] = pageRows.map((sub) => {
    const summary = summarizeSubmission(sub.summary);
    const user = users.get(sub.user_id);
    return {
      id: sub.id,
      user_id: sub.user_id,
      username: user?.username ?? 'Unknown User',
      email: user?.email ?? '',
      language: sub.language,
      status: sub.status || 'failed',
      summary: { total: summary.total, passed: summary.passed, failed: summary.failed },
      isCompileError: summary.isCompileError,
      created_at: sub.created_at,
    };
  });

  return (
    <ProblemSubmissionsClient
      initialSubmissions={formattedSubmissions}
      initialProblemName={problemName}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  );
}