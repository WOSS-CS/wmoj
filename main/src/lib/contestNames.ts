import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The contests each problem belongs to, by name, keyed by problem id.
 *
 * `problems` has no `contest` column — membership lives in the
 * `contest_problems` junction, so this is two queries: the junction rows, then
 * the names for the contest ids they mention.
 *
 * Only problems that sit in at least one contest get a key. Callers spell the
 * empty case `map[id] || []` rather than this pre-seeding every id, so a caller
 * can tell "no contests" from "not asked about".
 *
 * Pass only the ids on the current page — the staff list pages paginate on the
 * server and must never enrich beyond that page.
 */
export async function fetchContestNamesByProblem(
  supabase: SupabaseClient,
  problemIds: string[],
): Promise<Record<string, string[]>> {
  const problemContestNamesMap: Record<string, string[]> = {};
  if (problemIds.length === 0) return problemContestNamesMap;

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

  if (contestIdSet.size === 0) return problemContestNamesMap;

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
    // A contest id with no row back — deleted, or filtered out by RLS — shows
    // as the raw id rather than vanishing from the problem's list.
    problemContestNamesMap[pid] = cids.map((cid) => contestNameMap[cid] || cid);
  }

  return problemContestNamesMap;
}
