import { getServerSupabase } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ContestDetailClient from './ContestDetailClient';
import type { Contest } from '@/types/contest';

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    redirect('/contests');
  }

  // Check participation
  const { data: participationData } = await supabase
    .from('contest_participants')
    .select('user_id')
    .eq('user_id', userId)
    .eq('contest_id', id)
    .maybeSingle();

  if (!participationData) {
    redirect('/contests');
  }

  // Load contest
  const { data: contestData, error: contestError } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (contestError || !contestData) {
    return <ContestDetailClient id={id} error="Failed to load contest or inactive" />;
  }

  const contest = contestData as Contest;

  // Load problems
  const { data: problemsData } = await supabase
    .from('problems')
    .select('id,name')
    .eq('contest', id)
    .order('created_at', { ascending: true });

  const problems = problemsData || [];

  // Load leaderboard initially
  const { data: problemsFullData } = await supabase.from('problems').select('id').eq('contest', id);
  const problemIds = problemsFullData?.map(p => p.id) || [];
  
  let leaderboard: any[] = [];
  if (problemIds.length > 0) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('user_id, problem_id, results, summary, created_at')
      .in('problem_id', problemIds);
      
    if (submissions) {
      const problemIdSet = new Set(problemIds);
      const userScores = new Map<string, { totalScore: number; problemScores: Map<string, number>; userId: string }>();

      submissions.forEach(submission => {
        if (!problemIdSet.has(submission.problem_id)) return;
        const subUserId = submission.user_id;
        if (!userScores.has(subUserId)) {
          userScores.set(subUserId, { totalScore: 0, problemScores: new Map(), userId: subUserId });
        }
        const userData = userScores.get(subUserId)!;
        
        let score = 0;
        if (submission.summary && submission.summary.total > 0) {
          score = submission.summary.passed / submission.summary.total;
        } else if (submission.results && Array.isArray(submission.results) && submission.results.length > 0) {
          const passedCount = submission.results.filter((r: { passed: boolean }) => r.passed).length;
          score = passedCount / submission.results.length;
        }

        const currentProblemScore = userData.problemScores.get(submission.problem_id) || 0;
        if (score > currentProblemScore) {
          const scoreDiff = score - currentProblemScore;
          userData.problemScores.set(submission.problem_id, score);
          userData.totalScore += scoreDiff;
        }
      });

      const userIds = Array.from(userScores.keys());
      const { data: users } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds);
        
      const userById = new Map(users?.map(u => [u.id, u]) || []);
      const totalProblems = problemIds.length;

      leaderboard = Array.from(userScores.values())
        .map(userData => {
          const user = userById.get(userData.userId);
          let solvedCount = 0;
          userData.problemScores.forEach(score => { if (score >= 0.999) solvedCount++; });
          return {
            user_id: userData.userId,
            username: user?.username || user?.email?.split('@')[0] || 'Unknown',
            email: user?.email || '',
            total_score: userData.totalScore,
            solved_problems: solvedCount,
            total_problems: totalProblems,
            rank: 0
          };
        })
        .sort((a, b) => {
          if (Math.abs(b.total_score - a.total_score) > 0.001) return b.total_score - a.total_score;
          return b.solved_problems - a.solved_problems;
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  }

  return (
    <ContestDetailClient 
      id={id}
      initialContest={contest}
      initialProblems={problems}
      initialLeaderboard={leaderboard}
    />
  );
}
