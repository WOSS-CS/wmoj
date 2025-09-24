import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Get all problems for this contest first
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

    const totalProblems = problemIds.length;

    // Calculate scores per user
    const userScores = new Map<string, { 
      totalScore: number; 
      solvedProblems: Set<string>; 
      userId: string;
    }>();

    submissions?.forEach(submission => {
      if (!problemIds.includes(submission.problem_id)) return;
      
      const userId = submission.user_id;
      if (!userScores.has(userId)) {
        userScores.set(userId, {
          totalScore: 0,
          solvedProblems: new Set(),
          userId
        });
      }

      const userData = userScores.get(userId)!;
      
      // Calculate if submission passed based on results
      let passed = false;
      if (submission.summary && submission.summary.passed > 0) {
        // If summary shows passed test cases, consider it a pass
        passed = submission.summary.passed === submission.summary.total;
      } else if (submission.results && Array.isArray(submission.results)) {
        // Check if all test cases passed
        passed = submission.results.every((result: any) => result.passed === true);
      }
      
      if (passed && !userData.solvedProblems.has(submission.problem_id)) {
        userData.solvedProblems.add(submission.problem_id);
        userData.totalScore += 1;
      }
    });

    // Get user details for all participants
    const userIds = Array.from(userScores.keys());
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);

    if (usersErr) {
      console.log('Users fetch error:', usersErr);
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    // Create leaderboard entries
    const leaderboard = Array.from(userScores.values())
      .map(userData => {
        const user = users?.find(u => u.id === userData.userId);
        return {
          user_id: userData.userId,
          username: user?.username || 'Unknown',
          email: user?.email || '',
          total_score: userData.totalScore,
          solved_problems: userData.solvedProblems.size,
          total_problems: totalProblems,
          rank: 0 // Will be set after sorting
        };
      })
      .sort((a, b) => {
        // Sort by total score (descending), then by solved problems (descending)
        if (b.total_score !== a.total_score) {
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
