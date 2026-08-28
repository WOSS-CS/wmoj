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

/**
 * Rows per request in `fetchAllRows`. The loop below never assumes the
 * server honoured the full page, so this is a round-trip and memory tuning
 * knob and nothing more — correctness does not depend on its value.
 */
const FETCH_PAGE_SIZE = 1000;

/**
 * Hard bound on `fetchAllRows`. At the page size above this is 50,000 rows,
 * far past anything this board can legitimately need, so reaching it means
 * something is wrong — a pathological data set, or a query whose ordering
 * stopped being total and is walking in circles. Hitting it is reported as
 * a failure, never as a completed fetch: a leaderboard that is silently
 * wrong is worse than one that visibly did not load.
 */
const MAX_FETCH_PAGES = 50;

/** The subset of a PostgREST response `fetchAllRows` needs. */
interface PageResponse<T> {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
}

/**
 * Fetch every row a query matches, not merely the first page of them.
 *
 * PostgREST silently caps an unbounded result set: past the cap it answers
 * 206 Partial Content, and `postgrest-js` treats 206 as success. An
 * unbounded `.select()` therefore hands back a truncated array with
 * `error: null`, and every aggregate computed from it — a rank, a score, a
 * participant list — is confidently wrong with nothing to show for it.
 *
 * So page explicitly, and make completeness provable rather than assumed:
 *
 *   - `fetchPage` must ask for `{ count: 'exact' }`, which reports the size
 *     of the whole matching set regardless of any cap. The loop stops when
 *     it has that many rows, so a server-side cap *below* `FETCH_PAGE_SIZE`
 *     costs extra round trips instead of silently ending the walk early.
 *   - The offset advances by rows actually received, never by
 *     `page * FETCH_PAGE_SIZE`, for the same reason.
 *   - `fetchPage` must impose a *total* order (a unique column or a unique
 *     combination). LIMIT/OFFSET over an unordered relation may repeat or
 *     skip rows between pages, which would reintroduce the same bug from a
 *     different direction.
 */
async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResponse<T>>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let total: number | null = null;

  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const from = rows.length;
    const { data, error, count } = await fetchPage(from, from + FETCH_PAGE_SIZE - 1);

    if (error) return { rows: [], error: error.message };
    if (page === 0) total = count;

    const batch = data || [];
    for (const row of batch) rows.push(row);

    // An empty page always terminates: there is nothing left to walk.
    if (batch.length === 0) break;
    if (total !== null && rows.length >= total) break;
    // Only reachable if `{ count: 'exact' }` was omitted or the server
    // withheld the count. Falling back to "a short page is the last page"
    // is the weaker rule, but it is strictly better than looping forever.
    if (total === null && batch.length < FETCH_PAGE_SIZE) break;
  }

  if (total !== null && rows.length < total) {
    return { rows: [], error: `stopped after ${MAX_FETCH_PAGES} pages with ${rows.length}/${total} rows` };
  }
  return { rows, error: null };
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
      // Contest problems stay solvable as standalone practice before and after
      // the contest, so without this bound a solve from last month counted.
      const windows = new Map<string, ScoringWindow>();
      for (const row of joinResult.rows) {
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
        const submissionsResult = await fetchAllRows<SubmissionRow>((from, to) => {
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
          const problemIdSet = new Set(problemIds);
          const userScores = new Map<string, { totalScore: number; problemScores: Map<string, number>; userId: string }>();

          for (const submission of submissionsResult.rows) {
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

              leaderboard = Array.from(userScores.values())
                .map(userData => {
                  const user = userById.get(userData.userId);
                  let solvedCount = 0;
                  userData.problemScores.forEach(score => { if (score >= 0.999) solvedCount++; });
                  return {
                    user_id: userData.userId,
                    username: user?.username || 'Unknown',
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
