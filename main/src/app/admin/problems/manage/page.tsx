import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManageProblemsClient from './ManageProblemsClient';

const PAGE_SIZE = 20;

export default async function ManageProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, userId } = await requireActiveAdmin();

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const filterRaw = typeof sp.filter === 'string' ? sp.filter : 'all';
  const filter = filterRaw === 'active' || filterRaw === 'inactive' ? filterRaw : 'all';

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('problems')
    .select('id,name,is_active,updated_at,created_at,points', { count: 'exact' })
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (filter === 'active') query = query.eq('is_active', true);
  if (filter === 'inactive') query = query.eq('is_active', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: problemsData, count } = await query.range(from, to);

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(page, totalPages);
  if (effectivePage !== page) {
    redirect(
      buildPageHref(
        { search: search || undefined, filter: filter !== 'all' ? filter : undefined },
        effectivePage,
      ),
    );
  }

  const problems = problemsData || [];

  const problemIds = problems.map((p) => p.id);
  const problemContestNamesMap: Record<string, string[]> = {};

  if (problemIds.length > 0) {
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('problem_id, contest_id')
      .in('problem_id', problemIds);

    const contestIdSet = new Set<string>();
    const problemContestMap: Record<string, string[]> = {};
    for (const row of cpRows || []) {
      contestIdSet.add(row.contest_id);
      if (!problemContestMap[row.problem_id]) problemContestMap[row.problem_id] = [];
      problemContestMap[row.problem_id].push(row.contest_id);
    }

    if (contestIdSet.size > 0) {
      const { data: contestsData } = await supabase
        .from('contests')
        .select('id,name')
        .in('id', Array.from(contestIdSet));
      const contestNameMap = (contestsData || []).reduce(
        (acc: Record<string, string>, c: { id: string; name: string }) => {
          acc[c.id] = c.name;
          return acc;
        },
        {},
      );

      for (const [pid, cids] of Object.entries(problemContestMap)) {
        problemContestNamesMap[pid] = cids.map((cid) => contestNameMap[cid] || cid);
      }
    }
  }

  const enrichedProblems = problems.map((p) => ({
    ...p,
    contest_names: problemContestNamesMap[p.id] || [],
  }));

  return (
    <ManageProblemsClient
      rows={enrichedProblems}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
      currentFilter={filter}
    />
  );
}