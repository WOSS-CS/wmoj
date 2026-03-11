import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemDetailClient from './ProblemDetailClient';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { redirect } from 'next/navigation';

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  
  const { data: problem, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !problem) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problem or problem not found</p>
      </div>
    );
  }

  // Auth and participation check
  const { data: authUser } = await supabase.auth.getUser();
  const user = authUser?.user;

  if (problem.contest) {
    if (!user) {
      redirect('/problems');
    }
    const { data: participant } = await supabase
      .from('contest_participants')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('contest_id', problem.contest)
      .maybeSingle();
      
    if (!participant) {
      redirect('/problems');
    }

    const { expired } = await checkTimerExpiry(supabase, user.id, problem.contest);
    if (expired) {
      return (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
          <p className="text-sm text-error mb-2">Contest time has expired</p>
        </div>
      );
    }
  }

  // Fetch best submission
  let bestSummary = null;
  if (user) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('summary')
      .eq('user_id', user.id)
      .eq('problem_id', problem.id);
      
    if (subs && subs.length > 0) {
      for (const row of subs) {
        const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
        if (!s) continue;
        const current = { total: Number(s.total ?? 0), passed: Number(s.passed ?? 0), failed: Number(s.failed ?? 0) };
        if (!bestSummary || current.passed > bestSummary.passed || (current.passed === bestSummary.passed && current.total > bestSummary.total)) {
          bestSummary = current;
        }
      }
    }
  }

  return <ProblemDetailClient problem={problem} initialBestSummary={bestSummary} />;
}
