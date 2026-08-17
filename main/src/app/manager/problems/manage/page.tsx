import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerManageProblemsClient from './ManagerManageProblemsClient';

const PAGE_SIZE = 20;

export default async function ManagerManageProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const statusRaw = typeof sp.status === 'string' ? sp.status : 'all';
  const status: 'all' | 'active' | 'pending' =
    statusRaw === 'active' || statusRaw === 'pending' || statusRaw === 'inactive' ? statusRaw === 'inactive' ? 'pending' : statusRaw : 'all';

  const { count: pendingCount } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('problems')
    .select('id,name,is_active,updated_at,created_at,points', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'pending') query = query.eq('is_active', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: problemsData, count } = await query.range(from, to);

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(page, totalPages);
  if (effectivePage !== page) {
    redirect(
      buildPageHref(
        { search: search || undefined, status: status !== 'all' ? status : undefined },
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
    <ManagerManageProblemsClient
      rows={enrichedProblems}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
      currentStatus={status}
      pendingCount={pendingCount ?? 0}
    />
  );
}