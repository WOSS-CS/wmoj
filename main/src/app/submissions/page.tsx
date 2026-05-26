import { getServerSupabase } from '@/lib/supabaseServer';
import SubmissionsClient from './SubmissionsClient';

export interface SubmissionRow {
  id: string;
  user_id: string;
  username: string;
  problem_name: string;
  language: string;
  status: string;
  passed: number;
  total: number;
  created_at: string;
  classification: 'passed' | 'failed' | 'timeout' | 'compile_error' | 'error';
}

export interface SubmissionStats {
  passed: number;
  failed: number;
  timeout: number;
  compile_error: number;
  error: number;
  total: number;
}

type ResultItem = {
  timedOut?: boolean;
  exitCode?: number;
};

function classify(
  status: string,
  results: ResultItem[] | null,
  summaryTotal: number,
): SubmissionRow['classification'] {
  if (status === 'passed') return 'passed';
  const res = results || [];
  if (res.length === 0 && summaryTotal === 0) return 'compile_error';
  if (res.some((r) => r.timedOut)) return 'timeout';
  if (res.some((r) => (r.exitCode ?? 0) !== 0)) return 'error';
  return 'failed';
}

const PAGE_SIZE = 20;

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; problem?: string; user?: string; status?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params?.page) || 1);
  const problemSearch = params?.problem?.trim() || '';
  const userSearch = params?.user?.trim() || '';
  const statusFilter = (['all', 'passed', 'failed'] as const).includes(params?.status as 'all' | 'passed' | 'failed')
    ? (params?.status as 'all' | 'passed' | 'failed')
    : 'all';

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getServerSupabase();

  let submissions: SubmissionRow[] = [];
  let totalPages = 1;
  let stats: SubmissionStats = { passed: 0, failed: 0, timeout: 0, compile_error: 0, error: 0, total: 0 };
  let fetchError: string | undefined;

  try {
    // Resolve filter IDs server-side if search terms provided
    let filteredUserIds: string[] | null = null;
    let filteredProblemIds: string[] | null = null;

    if (userSearch) {
      const { data: matchingUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('username', `%${userSearch}%`);
      filteredUserIds = (matchingUsers || []).map((u) => u.id);
    }

    if (problemSearch) {
      const { data: matchingProblems } = await supabase
        .from('problems')
        .select('id')
        .ilike('name', `%${problemSearch}%`);
      filteredProblemIds = (matchingProblems || []).map((p) => p.id);
    }

    // If filter terms produced no matches, short-circuit
    const noResults =
      (filteredUserIds !== null && filteredUserIds.length === 0) ||
      (filteredProblemIds !== null && filteredProblemIds.length === 0);

    if (!noResults) {
      // Build paged query
      let query = supabase
        .from('submissions')
        .select('id, user_id, problem_id, language, status, summary, results, created_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false });

      if (statusFilter === 'passed') query = query.eq('status', 'passed');
      if (statusFilter === 'failed') query = query.neq('status', 'passed');
      if (filteredUserIds !== null) query = query.in('user_id', filteredUserIds);
      if (filteredProblemIds !== null) query = query.in('problem_id', filteredProblemIds);

      const { data: rawSubs, count, error: subsError } = await query.range(from, to);

      if (subsError) {
        fetchError = 'Failed to fetch submissions';
      } else {
        totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

        // Fetch only the users and problems referenced on this page
        const userIds = [...new Set((rawSubs || []).map((s) => s.user_id))];
        const problemIds = [...new Set((rawSubs || []).map((s) => s.problem_id))];

        const [usersResult, problemsResult] = await Promise.all([
          userIds.length > 0
            ? supabase.from('users').select('id, username').in('id', userIds)
            : Promise.resolve({ data: [] }),
          problemIds.length > 0
            ? supabase.from('problems').select('id, name').in('id', problemIds)
            : Promise.resolve({ data: [] }),
        ]);

        const userMap = new Map((usersResult.data || []).map((u) => [u.id, u.username]));
        const problemMap = new Map((problemsResult.data || []).map((p) => [p.id, p.name]));

        submissions = (rawSubs || []).map((s) => {
          const summary = s.summary as { passed?: number; total?: number } | null;
          const passed = summary?.passed ?? 0;
          const total = summary?.total ?? 0;
          const cls = classify(s.status ?? 'failed', s.results as ResultItem[] | null, total);
          return {
            id: s.id,
            user_id: s.user_id,
            username: userMap.get(s.user_id) ?? 'Unknown',
            problem_name: problemMap.get(s.problem_id) ?? 'Unknown Problem',
            language: s.language,
            status: s.status ?? 'failed',
            passed,
            total,
            created_at: s.created_at,
            classification: cls,
          };
        });
      }
    }

    // Stats: aggregate over filtered submissions (mirrors active search/filter)
    let statsQuery = supabase
      .from('submissions')
      .select('status, summary, results');

    if (statusFilter === 'passed') statsQuery = statsQuery.eq('status', 'passed');
    if (statusFilter === 'failed') statsQuery = statsQuery.neq('status', 'passed');
    if (filteredUserIds !== null) statsQuery = statsQuery.in('user_id', filteredUserIds);
    if (filteredProblemIds !== null) statsQuery = statsQuery.in('problem_id', filteredProblemIds);

    const { data: allSubsForStats } = noResults ? { data: [] } : await statsQuery;

    for (const s of allSubsForStats || []) {
      const summary = s.summary as { passed?: number; total?: number } | null;
      const total = summary?.total ?? 0;
      const cls = classify(s.status ?? 'failed', s.results as ResultItem[] | null, total);
      stats[cls]++;
      stats.total++;
    }
  } catch (err) {
    console.error('[SubmissionsPage] Error:', err);
    fetchError = 'Failed to fetch submissions';
  }

  return (
    <SubmissionsClient
      initialSubmissions={submissions}
      totalPages={totalPages}
      currentPage={currentPage}
      currentProblemSearch={problemSearch}
      currentUserSearch={userSearch}
      currentStatusFilter={statusFilter}
      stats={stats}
      fetchError={fetchError}
    />
  );
}
