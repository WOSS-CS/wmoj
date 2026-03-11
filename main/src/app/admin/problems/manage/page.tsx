import { getServerSupabase } from '@/lib/supabaseServer';
import ManageProblemsClient from './ManageProblemsClient';

export default async function ManageProblemsPage() {
  const supabase = await getServerSupabase();
  
  // Fetch contests
  const { data: contestsData } = await supabase
    .from('contests')
    .select('id,name');

  const contests = contestsData || [];
  
  // Fetch problems
  const { data: problemsData } = await supabase
    .from('problems')
    .select('id,name,contest,is_active,updated_at,created_at');

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
