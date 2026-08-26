import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import EditContestClient from './EditContestClient';

export default async function EditContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireActiveAdmin();

  // `contests` is world-readable, so without this scope the editor happily opens
  // — fully populated — on another admin's contest that the PATCH route can
  // never write. Admin-side only; managers see everything.
  const { data: contestData, error: contestError } = await supabase
    .from('contests')
    .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();

  if (contestError || !contestData) {
    redirect('/admin/contests/manage');
  }

  // Load problems assigned to this contest via junction table
  const { data: cpRows } = await supabase
    .from('contest_problems')
    .select('problem_id, problems(id, name, points)')
    .eq('contest_id', id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contestProblems = (cpRows || []).map((row: any) => {
    const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
    return { id: p.id as string, name: p.name as string, points: p.points as number | null };
  });

  return <EditContestClient contest={contestData} initialProblems={contestProblems} />;
}
