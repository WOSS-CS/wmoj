/**
 * Contest leaderboard arithmetic, pure.
 *
 * All of this sat inside `app/contests/[id]/leaderboard/page.tsx` — a server
 * component — where none of it could be exercised without a live contest, a
 * live participant and a live submission. It is the code that decides who wins,
 * so "verified by looking at it" was not good enough. The page keeps the
 * queries and the bounding; the rules live here.
 *
 * Pure: no imports, no I/O, no clock. Every time is a millisecond number the
 * caller derived from a timestamp.
 */

/** The window during which a participant's submissions count towards the board. */
export interface ScoringWindow {
  fromMs: number;
  toMs: number;
}

/** One `join_history` row. Only non-virtual joins are ranked. */
export interface JoinHistoryRow {
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
}

/** One `submissions` row, as the leaderboard query selects it. */
export interface ScoredSubmissionRow {
  user_id: string;
  problem_id: string;
  /** Nullable in the schema; a row with no timestamp fits no window. */
  created_at: string | null;
  /** `jsonb`, so its shape is a runtime fact — read through `summaryScore`. */
  summary: unknown;
}

/** One ranked row of the board. */
export interface LeaderEntry {
  user_id: string;
  username: string;
  total_score: number;
  solved_problems: number;
  total_problems: number;
  rank: number;
}

/**
 * The per-problem score at which a problem counts as solved.
 *
 * Not 1.0: the score is a float division (`passed / total`), so a fully-passed
 * 3-case problem is 0.9999999999999998 rather than 1. The threshold is the
 * float-tolerance form of "all cases passed".
 */
export const SOLVED_THRESHOLD = 0.999;

/**
 * A submission's share of one problem, in [0, 1].
 *
 * INVARIANT 5: contest leaderboards are NOT point-weighted, so a problem
 * contributes at most 1.0 however many points it is worth. Anything that is not
 * the expected `{total, passed}` object scores 0 rather than throwing — the
 * column is `jsonb` and a malformed summary must not take the whole board down.
 */
function summaryScore(summary: unknown): number {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return 0;
  const record = summary as Record<string, unknown>;
  const total = typeof record.total === 'number' ? record.total : 0;
  const passed = typeof record.passed === 'number' ? record.passed : 0;
  return total > 0 ? passed / total : 0;
}

/**
 * Pure. One scoring window per participant, from their `join_history` rows.
 *
 * Contest problems stay solvable as standalone practice before and after the
 * contest, so without this bound a solve from last month would count.
 *
 * - `joined_at` null falls back to the contest start, then to −∞ (a contest
 *   with no start window ranks everything the participant ever did).
 * - `left_at` null falls back to when the countdown would have run out
 *   (`joined_at + length`), then to +∞.
 * - A user with several rows — rejoined, or joined more than one way — gets the
 *   UNION of their windows, not the last one seen.
 */
export function buildScoringWindows(
  rows: readonly JoinHistoryRow[],
  contestStartsMs: number | null,
  lengthMs: number | null,
): Map<string, ScoringWindow> {
  const windows = new Map<string, ScoringWindow>();

  for (const row of rows) {
    if (!row.user_id) continue;

    const joinedMs = row.joined_at
      ? new Date(row.joined_at).getTime()
      : (contestStartsMs ?? Number.NEGATIVE_INFINITY);
    const leftMs = row.left_at
      ? new Date(row.left_at).getTime()
      : (Number.isFinite(joinedMs) && lengthMs !== null ? joinedMs + lengthMs : Number.POSITIVE_INFINITY);

    const existing = windows.get(row.user_id);
    windows.set(
      row.user_id,
      existing
        ? { fromMs: Math.min(existing.fromMs, joinedMs), toMs: Math.max(existing.toMs, leftMs) }
        : { fromMs: joinedMs, toMs: leftMs },
    );
  }

  return windows;
}

/** What one participant scored, and on which problems. */
export interface ParticipantScore {
  totalScore: number;
  /** problem_id → best score in [0, 1]. Count the entries at or above {@link SOLVED_THRESHOLD}. */
  problemScores: Map<string, number>;
}

/**
 * Pure. Score every participant over their own window.
 *
 * INVARIANT 5 lives here: a problem contributes its BEST `passed/total` inside
 * the window and at most 1.0 — never the sum of its attempts, and never
 * weighted by the problem's point value.
 *
 * Three things are ignored rather than defaulted, each because the permissive
 * reading is a real defect that has happened:
 *   - a submission for a problem outside `problemIds` (practice on a problem
 *     that is not in this contest),
 *   - a submission from someone with no window (an empty participant set means
 *     nobody is ranked, never "rank everyone"),
 *   - a submission whose `created_at` is null or outside the window. BOTH ENDS
 *     ARE INCLUSIVE: a solve on the closing millisecond counts.
 */
export function scoreParticipants(
  subs: readonly ScoredSubmissionRow[],
  windows: ReadonlyMap<string, ScoringWindow>,
  problemIds: ReadonlySet<string>,
): Map<string, ParticipantScore> {
  const scores = new Map<string, ParticipantScore>();

  for (const submission of subs) {
    if (!problemIds.has(submission.problem_id)) continue;

    const window = windows.get(submission.user_id);
    if (!window) continue;

    if (!submission.created_at) continue;
    const submittedMs = new Date(submission.created_at).getTime();
    if (submittedMs < window.fromMs || submittedMs > window.toMs) continue;

    let entry = scores.get(submission.user_id);
    if (!entry) {
      entry = { totalScore: 0, problemScores: new Map() };
      scores.set(submission.user_id, entry);
    }

    const score = summaryScore(submission.summary);
    const best = entry.problemScores.get(submission.problem_id) || 0;
    if (score > best) {
      entry.totalScore += score - best;
      entry.problemScores.set(submission.problem_id, score);
    }
  }

  return scores;
}

/**
 * Pure. Order the board and number it: score descending (differences under
 * 0.001 are a tie — the score is a float division), then solved problems
 * descending, then username ascending so the order is stable.
 *
 * Ranks are `1..n` with no shared numbers: a tie is broken by the fallbacks
 * above, and the board has always shown distinct positions.
 *
 * Does not mutate its argument.
 */
export function rankLeaderboard(entries: readonly Omit<LeaderEntry, 'rank'>[]): LeaderEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (Math.abs(b.total_score - a.total_score) > 0.001) return b.total_score - a.total_score;
      if (b.solved_problems !== a.solved_problems) return b.solved_problems - a.solved_problems;
      return a.username.localeCompare(b.username);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
