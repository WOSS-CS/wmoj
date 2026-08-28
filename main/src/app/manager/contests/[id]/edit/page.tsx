import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { CONTEST_EDIT_COLUMNS } from '@/lib/queries/contests';
import { CONTEST_PROBLEM_PICKER_COLUMNS } from '@/lib/queries/contestProblems';
import type { SearchableProblem } from '@/components/ProblemSearch';
import ManagerEditContestClient from './ManagerEditContestClient';

export default async function ManagerEditContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireActiveManager();

  const { data: contestData, error: contestError } = await supabase
    .from('contests')
    .select(CONTEST_EDIT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (contestError || !contestData) {
    redirect('/manager/contests/manage');
  }

  // Load problems assigned to this contest via junction table
  const { data: cpRows } = await supabase
    .from('contest_problems')
    .select(CONTEST_PROBLEM_PICKER_COLUMNS)
    .eq('contest_id', id);

  // PostgREST returns a to-one embed as an object; the array arm is kept because
  // a hand-written type used to claim both and dropping it silently would be a
  // behaviour change nobody could see. A link whose problem row is gone is
  // skipped rather than crashing on `p.id`.
  const contestProblems: SearchableProblem[] = (cpRows || []).flatMap((row) => {
    const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
    return p ? [{ id: p.id, name: p.name, points: p.points }] : [];
  });

  return <ManagerEditContestClient contest={contestData} initialProblems={contestProblems} />;
}
