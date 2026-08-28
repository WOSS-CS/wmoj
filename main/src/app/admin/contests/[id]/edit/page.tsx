import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { CONTEST_EDIT_COLUMNS } from '@/lib/queries/contests';
import { CONTEST_PROBLEM_PICKER_COLUMNS } from '@/lib/queries/contestProblems';
import type { SearchableProblem } from '@/components/ProblemSearch';
import EditContestClient from './EditContestClient';

export default async function EditContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireActiveAdmin();

  // `contests` is world-readable, so without this scope the editor happily opens
  // — fully populated — on another admin's contest that the PATCH route can
  // never write. Admin-side only; managers see everything.
  const { data: contestData, error: contestError } = await supabase
    .from('contests')
    .select(CONTEST_EDIT_COLUMNS)
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();

  if (contestError || !contestData) {
    redirect('/admin/contests/manage');
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

  return <EditContestClient contest={contestData} initialProblems={contestProblems} />;
}
