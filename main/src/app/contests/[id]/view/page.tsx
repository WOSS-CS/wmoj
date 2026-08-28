import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestViewClient from './ContestViewClient';
import { canUserAccessContest } from '@/lib/contestAccess';
import { CONTEST_DETAIL_COLUMNS } from '@/lib/queries/contests';

interface EmbeddedProblem {
  id: string;
  name: string;
  points: number;
  /** `problems.created_at` is nullable; a row without one sorts first. */
  created_at: string | null;
}

/** Oldest first, with a missing `created_at` treated as the epoch. */
function addedAtMs(problem: { created_at: string | null }): number {
  return problem.created_at ? new Date(problem.created_at).getTime() : 0;
}

export default async function ContestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [contestResult, authResult] = await Promise.all([
    supabase
      .from('contests')
      .select(CONTEST_DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const { data: contestData, error } = contestResult;
  if (error || !contestData) {
    notFound();
  }

  const { data: authUser } = authResult;
  const hasAccess = await canUserAccessContest(supabase, contestData, authUser?.user?.id ?? null);
  if (!hasAccess) {
    notFound();
  }

  // Fetch problems belonging to this contest via junction table. The is_active
  // filter runs in the database, matching the other four contest problem lists.
  const { data: cpRows, error: cpErr } = await supabase
    .from('contest_problems')
    .select('problem_id, problems!inner(id, name, points, created_at, is_active)')
    .eq('contest_id', id)
    .eq('problems.is_active', true);

  if (cpErr) {
    console.error('[ContestViewPage] contest problems fetch error:', cpErr);
  }

  const problems = (cpRows || [])
    .map((row) => (Array.isArray(row.problems) ? row.problems[0] : row.problems))
    .filter((p): p is EmbeddedProblem => !!p)
    .map((p) => ({ id: p.id, name: p.name, points: p.points, created_at: p.created_at }))
    .sort((a, b) => addedAtMs(a) - addedAtMs(b));

  return <ContestViewClient initialContest={contestData} problems={problems || []} />;
}
