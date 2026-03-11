import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManageProblemsClient from './ManageProblemsClient';

export default async function ManageProblemsPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/dashboard');
  
  const [
    { data: contestsData },
    { data: problemsData }
  ] = await Promise.all([
    supabase
      .from('contests')
      .select('id,name'),
    supabase
      .from('problems')
      .select('id,name,contest,is_active,updated_at,created_at')
  ]);

  const contests = contestsData || [];
  const problems = problemsData || [];

  // Map contests to problems
  let contestNameMap: Record<string, string> = {};
  if (contests.length > 0) {
    contestNameMap = contests.reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }

  const enrichedProblems = problems.map(p => ({
    ...p,
    contest_name: p.contest ? (contestNameMap[p.contest] || p.contest) : null,
  }));

  return (
    <ManageProblemsClient 
      initialProblems={enrichedProblems} 
      initialContests={contests} 
    />
  );
}
