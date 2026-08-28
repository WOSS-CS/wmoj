import { redirect } from 'next/navigation';
import ManagerDashboardClient from './ManagerDashboardClient';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import {
  SUBMISSION_PUBLIC_COLUMNS,
  resolveSubmissionNames,
  summarizeSubmission,
} from '@/lib/queries/submissions';

const PAGE_SIZE = 20;

export type ManagerSubmissionRow = {
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
    .select(SUBMISSION_PUBLIC_COLUMNS, { count: 'exact' })
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

  const pageRows = subs || [];
  const { users, problems } = await resolveSubmissionNames(supabase, pageRows, 'staff');

  const rows: ManagerSubmissionRow[] = pageRows.map((s) => {
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
    <ManagerDashboardClient
      initialSubmissions={rows}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  );
}