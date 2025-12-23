import { NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;
    const supabase = bearer ? getServerSupabaseFromToken(bearer) : await getServerSupabase();

    // Get all problems for this contest first.
    const { data: problems, error: problemsErr } = await supabase
      .from('problems')
      .select('id')
      .eq('contest', id);

    if (problemsErr) {
      console.log('Problems fetch error:', problemsErr);
      return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
    }

    const problemIds = problems?.map(p => p.id) || [];
    if (problemIds.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Get all submissions for this contest
    const { data: submissions, error: submissionsErr } = await supabase
      .from('submissions')
      .select(`
        user_id,
        problem_id,
        results,
        summary,
        created_at
      `)
      .in('problem_id', problemIds);

    if (submissionsErr) {
      console.log('Submissions fetch error:', submissionsErr);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    console.log('Submissions query result:', { submissions, submissionsErr, problemIds });

    const totalProblems = problemIds.length;

    // Calculate scores per user - optimized single pass
    const problemIdSet = new Set(problemIds);
    const userScores = new Map<string, {
      totalScore: number;
      problemScores: Map<string, number>;
      userId: string;
    }>();

    submissions?.forEach(submission => {
      // Use Set for O(1) lookup instead of Array.includes O(n)
      if (!problemIdSet.has(submission.problem_id)) return;

      const userId = submission.user_id;
      if (!userScores.has(userId)) {
        userScores.set(userId, {
          totalScore: 0,
          problemScores: new Map(),
          userId
        });
      }

      const userData = userScores.get(userId)!;

      // Calculate score based on passed test cases
      let score = 0;
      if (submission.summary && submission.summary.total > 0) {
        score = submission.summary.passed / submission.summary.total;
      } else if (submission.results && Array.isArray(submission.results) && submission.results.length > 0) {
        const passedCount = submission.results.filter((r: { passed: boolean }) => r.passed).length;
        score = passedCount / submission.results.length;
      }

      // Update best score for this problem
      const currentProblemScore = userData.problemScores.get(submission.problem_id) || 0;
      if (score > currentProblemScore) {
        const scoreDiff = score - currentProblemScore;
        userData.problemScores.set(submission.problem_id, score);
        // Update total score incrementally instead of recalculating
        userData.totalScore += scoreDiff;
      }
    });

    // Get user details for all participants
    const userIds = Array.from(userScores.keys());
    console.log('User IDs from submissions:', userIds);

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);

    if (usersErr) {
      console.log('Users fetch error:', usersErr);
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    // Create user lookup map for O(1) access instead of O(n) find
    const userById = new Map(users?.map(u => [u.id, u]) || []);

    // Create leaderboard entries - optimized single pass with combined operations
    const leaderboard = Array.from(userScores.values())
      .map(userData => {
        const user = userById.get(userData.userId);
        // Calculate solved count (full scores) directly during mapping
        let solvedCount = 0;
        userData.problemScores.forEach(score => {
          if (score >= 0.999) solvedCount++; // Floating point tolerance
        });
        
        return {
          user_id: userData.userId,
          username: user?.username || user?.email?.split('@')[0] || 'Unknown',
          total_score: userData.totalScore,
          solved_problems: solvedCount,
          total_problems: totalProblems,
          rank: 0
        };
      })
      .sort((a, b) => {
        // Sort by total score (descending), then by solved problems (descending)
        if (Math.abs(b.total_score - a.total_score) > 0.001) {
          return b.total_score - a.total_score;
        }
        return b.solved_problems - a.solved_problems;
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    return NextResponse.json({ leaderboard });
  } catch (e) {
    console.log('Leaderboard error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
