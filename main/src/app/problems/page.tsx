import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages } from '@/lib/pagination';
import ProblemsClient from './ProblemsClient';
import { Problem } from '@/types/problem';
import { getContestStatus } from '@/utils/contestStatus';

export type HotProblem = Problem & { submission_count: number };

const PAGE_SIZE = 20;

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = parsePage(params?.page);
  const search = params?.search?.trim() || '';
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const supabase = await getServerSupabase();

  // Find all contests and determine which are "ongoing" (problems should be hidden)
  const { data: allContests } = await supabase
    .from('contests')
    .select('id, is_active, starts_at, ends_at');

  const ongoingContestIds = (allContests || [])
    .filter(c => getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null }) === 'ongoing')
    .map(c => c.id);

  // Get problem IDs that are in ongoing contests (these should be excluded)
  let excludedProblemIds: string[] = [];
  if (ongoingContestIds.length > 0) {
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('problem_id')
      .in('contest_id', ongoingContestIds);
    excludedProblemIds = (cpRows || []).map((r: { problem_id: string }) => r.problem_id);
  }

  let query = supabase
    .from('problems')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (excludedProblemIds.length > 0) {
    query = query.not('id', 'in', `(${excludedProblemIds.join(',')})`);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: problems, count, error } = await query.range(from, to);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problems</p>
      </div>
    );
  }

  const problemList = (problems as Problem[]) || [];
  const totalPages = computeTotalPages(count, PAGE_SIZE);

  // Hot problems: computed from all submissions (lightweight single-column fetch)
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('problem_id')
    .not('problem_id', 'is', null);

  const countMap: Record<string, number> = {};
  for (const s of allSubs || []) {
    const pid = s.problem_id as string;
    if (pid) countMap[pid] = (countMap[pid] || 0) + 1;
  }

  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let hotProblems: HotProblem[] = [];
  if (topIds.length > 0) {
    let hotQuery = supabase
      .from('problems')
      .select('*')
      .in('id', topIds)
      .eq('is_active', true);

    if (excludedProblemIds.length > 0) {
      hotQuery = hotQuery.not('id', 'in', `(${excludedProblemIds.join(',')})`);
    }

    const { data: hotData } = await hotQuery;
    hotProblems = (hotData || [])
      .map(p => ({ ...p, submission_count: countMap[p.id] || 0 }))
      .sort((a, b) => b.submission_count - a.submission_count);
  }

  return (
    <ProblemsClient
      initialProblems={problemList}
      hotProblems={hotProblems}
      totalPages={totalPages}
      currentPage={currentPage}
      currentSearch={search}
    />
  );
}
