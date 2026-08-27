import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestLeaderboardClient from './LeaderboardClient';
import { canUserAccessContest } from '@/lib/contestAccess';

interface LeaderEntry {
  user_id: string;
  username: string;
  total_score: number;
  solved_problems: number;
  total_problems: number;
  rank: number;
}

interface JoinHistoryRow {
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
}

interface SubmissionRow {
  user_id: string;
  problem_id: string;
  created_at: string;
  summary: { total?: number; passed?: number } | null;
}

/** The window during which a participant's submissions count towards the board. */
interface ScoringWindow {
  fromMs: number;
  toMs: number;
}

export default async function ContestLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [contestResult, cpResult, authResult] = await Promise.all([
    supabase
      .from('contests')
      .select('id, name, is_active, created_by, length, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('contest_problems')
      .select('problem_id')
      .eq('contest_id', id),
    supabase.auth.getUser(),
  ]);

  const { data: contestData, error: contestError } = contestResult;
  if (contestError || !contestData) {
    notFound();
  }

  const { data: authUser } = authResult;
  const hasAccess = await canUserAccessContest(supabase, contestData, authUser?.user?.id ?? null);
  if (!hasAccess) {
    notFound();
  }

  const contestName = contestData.name || 'Contest';
  const lengthMs = contestData.length > 0 ? contestData.length * 60_000 : null;
  const contestStartsMs = contestData.starts_at ? new Date(contestData.starts_at).getTime() : null;

  const problemIds = (cpResult.data || []).map((r: { problem_id: string }) => r.problem_id);

  let leaderboard: LeaderEntry[] = [];
  let loadError: string | undefined;

  if (problemIds.length > 0) {
    // Only non-virtual joiners are ranked (Invariant 5's board is the competitive
    // one; ContestViewClient promises virtual runs "do not affect the
    // leaderboard"). The error is checked rather than discarded: an empty result
    // and a failed query are indistinguishable, and treating a failure as "no
    // participants" is what used to silently widen the board to every user who
    // had ever practised one of these problems.
    const { data: joinRows, error: joinErr } = await supabase
      .from('join_history')
      .select('user_id, joined_at, left_at')
      .eq('contest_id', id)
      .eq('is_virtual', false);

    if (joinErr) {
      console.error('[ContestLeaderboard] join_history fetch error:', joinErr);
      loadError = 'Failed to load the leaderboard.';
    } else {
      // Each participant is scored only over their own run: from when they
      // joined until they left, or until their countdown would have run out.
      // Contest problems stay solvable as standalone practice before and after
      // the contest, so without this bound a solve from last month counted.
      const windows = new Map<string, ScoringWindow>();
      for (const row of (joinRows || []) as JoinHistoryRow[]) {
        if (!row.user_id) continue;

        const joinedMs = row.joined_at ? new Date(row.joined_at).getTime() : (contestStartsMs ?? Number.NEGATIVE_INFINITY);
        const leftMs = row.left_at
          ? new Date(row.left_at).getTime()
          : (Number.isFinite(joinedMs) && lengthMs !== null ? joinedMs + lengthMs : Number.POSITIVE_INFINITY);

        const existing = windows.get(row.user_id);
        windows.set(row.user_id, existing
          ? { fromMs: Math.min(existing.fromMs, joinedMs), toMs: Math.max(existing.toMs, leftMs) }
          : { fromMs: joinedMs, toMs: leftMs });
      }

      if (windows.size > 0) {
        // Narrow the query to the union of every participant's window so the
        // row set is bounded in the database, not just in memory. `results` is
        // deliberately not selected — it is a heavy per-row copy of the whole
        // test set and `summary` already carries passed/total.
        let query = supabase
          .from('submissions')
          .select('user_id, problem_id, summary, created_at')
          .in('problem_id', problemIds)
          // Only the participants can be ranked, and `windows` is already the
          // complete set — so bound the rows in the database instead of
          // fetching every practice solve and discarding it below.
          .in('user_id', Array.from(windows.keys()));

        let earliest = Number.POSITIVE_INFINITY;
        let latest = Number.NEGATIVE_INFINITY;
        for (const w of windows.values()) {
          if (w.fromMs < earliest) earliest = w.fromMs;
          if (w.toMs > latest) latest = w.toMs;
        }
        if (Number.isFinite(earliest)) query = query.gte('created_at', new Date(earliest).toISOString());
        if (Number.isFinite(latest)) query = query.lte('created_at', new Date(latest).toISOString());

        const { data: submissions, error: submissionsErr } = await query;

        if (submissionsErr) {
          console.error('[ContestLeaderboard] submissions fetch error:', submissionsErr);
          loadError = 'Failed to load the leaderboard.';
        } else {
          const problemIdSet = new Set(problemIds);
          const userScores = new Map<string, { totalScore: number; problemScores: Map<string, number>; userId: string }>();

          for (const submission of (submissions || []) as SubmissionRow[]) {
            if (!problemIdSet.has(submission.problem_id)) continue;

            // Unconditional: a participant set that is empty means nobody is
            // ranked, never "rank everyone".
            const window = windows.get(submission.user_id);
            if (!window) continue;

            const submittedMs = new Date(submission.created_at).getTime();
            if (submittedMs < window.fromMs || submittedMs > window.toMs) continue;

            const subUserId = submission.user_id;
            if (!userScores.has(subUserId)) {
              userScores.set(subUserId, { totalScore: 0, problemScores: new Map(), userId: subUserId });
            }
            const userData = userScores.get(subUserId)!;

            const total = submission.summary?.total ?? 0;
            const score = total > 0 ? (submission.summary?.passed ?? 0) / total : 0;

            const currentProblemScore = userData.problemScores.get(submission.problem_id) || 0;
            if (score > currentProblemScore) {
              userData.totalScore += score - currentProblemScore;
              userData.problemScores.set(submission.problem_id, score);
            }
          }

          const userIds = Array.from(userScores.keys());
          if (userIds.length > 0) {
            const { data: users, error: usersErr } = await supabase
              .from('users')
              .select('id, username, email')
              .in('id', userIds);

            if (usersErr) {
              console.error('[ContestLeaderboard] users fetch error:', usersErr);
              loadError = 'Failed to load the leaderboard.';
            } else {
              const userById = new Map((users || []).map(u => [u.id, u]));
              const totalProblems = problemIds.length;

              leaderboard = Array.from(userScores.values())
                .map(userData => {
                  const user = userById.get(userData.userId);
                  let solvedCount = 0;
                  userData.problemScores.forEach(score => { if (score >= 0.999) solvedCount++; });
                  return {
                    user_id: userData.userId,
                    username: user?.username || user?.email?.split('@')[0] || 'Unknown',
                    total_score: userData.totalScore,
                    solved_problems: solvedCount,
                    total_problems: totalProblems,
                    rank: 0,
                  };
                })
                .sort((a, b) => {
                  if (Math.abs(b.total_score - a.total_score) > 0.001) return b.total_score - a.total_score;
                  if (b.solved_problems !== a.solved_problems) return b.solved_problems - a.solved_problems;
                  return a.username.localeCompare(b.username);
                })
                .map((entry, index) => ({ ...entry, rank: index + 1 }));
            }
          }
        }
      }
    }
  }

  return (
    <ContestLeaderboardClient
      contestName={contestName}
      initialLeaderboard={leaderboard}
      error={loadError}
    />
  );
}
