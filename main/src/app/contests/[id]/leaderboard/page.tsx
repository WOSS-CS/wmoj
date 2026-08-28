import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestLeaderboardClient from './LeaderboardClient';
import { canUserAccessContest } from '@/lib/contestAccess';
import { fetchAllRows } from '@/lib/fetchAllRows';
import {
  SOLVED_THRESHOLD,
  buildScoringWindows,
  rankLeaderboard,
  scoreParticipants,
  type JoinHistoryRow,
  type LeaderEntry,
  type ScoredSubmissionRow,
} from '@/lib/contestScoring';

export default async function ContestLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [contestResult, cpResult, authResult] = await Promise.all([
    supabase
      .from('contests')
      .select('id, name, is_active, created_by, length, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle(),
    fetchAllRows<{ problem_id: string }>((from, to) =>
      supabase
        .from('contest_problems')
        .select('problem_id', { count: 'exact' })
        .eq('contest_id', id)
        // `(contest_id, problem_id)` is the primary key, and `contest_id` is
        // pinned above, so `problem_id` alone is a total order here.
        .order('problem_id', { ascending: true })
        .range(from, to),
    ),
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

  const problemIds = cpResult.rows.map(r => r.problem_id);

  let leaderboard: LeaderEntry[] = [];
  let loadError: string | undefined;

  // A failed problem-set fetch is not "this contest has no problems". Left
  // unchecked it renders an empty board that looks authoritative, and it
  // also understates `total_problems` on every row if it only truncated.
  if (cpResult.error) {
    console.error('[ContestLeaderboard] contest_problems fetch error:', cpResult.error);
    loadError = 'Failed to load the leaderboard.';
  } else if (problemIds.length > 0) {
    // Only non-virtual joiners are ranked (Invariant 5's board is the competitive
    // one; ContestViewClient promises virtual runs "do not affect the
    // leaderboard"). The error is checked rather than discarded: an empty result
    // and a failed query are indistinguishable, and treating a failure as "no
    // participants" is what used to silently widen the board to every user who
    // had ever practised one of these problems.
    const joinResult = await fetchAllRows<JoinHistoryRow>((from, to) =>
      supabase
        .from('join_history')
        .select('user_id, joined_at, left_at', { count: 'exact' })
        .eq('contest_id', id)
        .eq('is_virtual', false)
        // `id` is the uuid primary key — a total order, which range paging
        // requires. `joined_at` is neither unique nor NOT NULL.
        .order('id', { ascending: true })
        .range(from, to),
    );

    if (joinResult.error) {
      console.error('[ContestLeaderboard] join_history fetch error:', joinResult.error);
      loadError = 'Failed to load the leaderboard.';
    } else {
      // Each participant is scored only over their own run: from when they
      // joined until they left, or until their countdown would have run out.
      const windows = buildScoringWindows(joinResult.rows, contestStartsMs, lengthMs);

      if (windows.size > 0) {
        const participantIds = Array.from(windows.keys());

        let earliest = Number.POSITIVE_INFINITY;
        let latest = Number.NEGATIVE_INFINITY;
        for (const w of windows.values()) {
          if (w.fromMs < earliest) earliest = w.fromMs;
          if (w.toMs > latest) latest = w.toMs;
        }

        // Narrow the query to the union of every participant's window so the
        // row set is bounded in the database, not just in memory. `results` is
        // deliberately not selected — it is a heavy per-row copy of the whole
        // test set and `summary` already carries passed/total.
        //
        // Those filters bound the set but do not bound the *response*: a
        // contest with enough participants still crosses the PostgREST cap,
        // and a truncated submission set mis-ranks the board with no error to
        // show for it. The per-participant windows, the per-problem best
        // score and Invariant 5's un-weighted scoring are too intricate to
        // push into SQL honestly, so the fetch is made provably complete
        // instead and the arithmetic stays here.
        const submissionsResult = await fetchAllRows<ScoredSubmissionRow>((from, to) => {
          let query = supabase
            .from('submissions')
            .select('user_id, problem_id, summary, created_at', { count: 'exact' })
            .in('problem_id', problemIds)
            // Only the participants can be ranked, and `windows` is already the
            // complete set — so bound the rows in the database instead of
            // fetching every practice solve and discarding it below.
            .in('user_id', participantIds);

          if (Number.isFinite(earliest)) query = query.gte('created_at', new Date(earliest).toISOString());
          if (Number.isFinite(latest)) query = query.lte('created_at', new Date(latest).toISOString());

          // `created_at` is not unique, so it cannot page on its own.
          return query.order('id', { ascending: true }).range(from, to);
        });

        if (submissionsResult.error) {
          console.error('[ContestLeaderboard] submissions fetch error:', submissionsResult.error);
          loadError = 'Failed to load the leaderboard.';
        } else {
          const userScores = scoreParticipants(submissionsResult.rows, windows, new Set(problemIds));

          const userIds = Array.from(userScores.keys());
          if (userIds.length > 0) {
            const usersResult = await fetchAllRows<{ id: string; username: string }>((from, to) =>
              supabase
                .from('users')
                // NEVER select `email` here. This page renders for anonymous
                // visitors (no staff guard, `getServerSupabase()` is the anon
                // client when logged out), so every column it names is a column
                // `anon` must hold SELECT on — and `users.email` is PII that is
                // now revoked from `anon`. `username` is NOT NULL, so it is
                // always a sufficient display name on its own.
                .select('id, username', { count: 'exact' })
                .in('id', userIds)
                .order('id', { ascending: true })
                .range(from, to),
            );

            if (usersResult.error) {
              console.error('[ContestLeaderboard] users fetch error:', usersResult.error);
              loadError = 'Failed to load the leaderboard.';
            } else {
              const userById = new Map(usersResult.rows.map(u => [u.id, u]));
              const totalProblems = problemIds.length;

              leaderboard = rankLeaderboard(
                Array.from(userScores.entries()).map(([userId, scored]) => {
                  let solvedCount = 0;
                  scored.problemScores.forEach(score => { if (score >= SOLVED_THRESHOLD) solvedCount++; });
                  return {
                    user_id: userId,
                    username: userById.get(userId)?.username || 'Unknown',
                    total_score: scored.totalScore,
                    solved_problems: solvedCount,
                    total_problems: totalProblems,
                  };
                }),
              );
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
