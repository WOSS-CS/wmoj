import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import ContestDetailClient from './ContestDetailClient';
import { canUserAccessContest } from '@/lib/contestAccess';
import type { Contest } from '@/types/contest';

interface EmbeddedProblem {
  id: string;
  name: string;
  created_at: string;
}

interface ContestProblemRow {
  problem_id: string;
  problems: EmbeddedProblem | EmbeddedProblem[] | null;
}

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    redirect('/contests');
  }

  // Check participation and load data concurrently
  const [partResult, contestResult, cpResult] = await Promise.all([
    supabase
      .from('contest_participants')
      .select('user_id')
      .eq('user_id', userId)
      .eq('contest_id', id)
      .maybeSingle(),
    supabase
      .from('contests')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    // Inner embed + is_active filter, matching /contests, /contests/[id]/view and
    // api/contests. Without it a pending problem was listed here and counted in
    // the metadata row, contradicting the badge on /contests and linking to a
    // /problems/<pending> that 404s via canUserAccessProblem.
    supabase
      .from('contest_problems')
      .select('problem_id, problems!inner(id, name, created_at, is_active)')
      .eq('contest_id', id)
      .eq('problems.is_active', true),
  ]);

  const { data: contestData, error: contestError } = contestResult;
  if (contestError || !contestData) {
    notFound();
  }

  const contest = contestData as Contest;

  const hasAccess = await canUserAccessContest(supabase, contest, userId);
  if (!hasAccess) {
    notFound();
  }

  const { data: participationData } = partResult;
  if (!participationData) {
    redirect('/contests');
  }

  // Extract problems from junction table result
  const cpRows = (cpResult.data || []) as unknown as ContestProblemRow[];
  const problems = cpRows
    .map((row) => (Array.isArray(row.problems) ? row.problems[0] : row.problems))
    .filter((p): p is EmbeddedProblem => !!p)
    .map((p) => ({ id: p.id, name: p.name, created_at: p.created_at }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <ContestDetailClient
      id={id}
      initialContest={contest}
      initialProblems={problems}
    />
  );
}
